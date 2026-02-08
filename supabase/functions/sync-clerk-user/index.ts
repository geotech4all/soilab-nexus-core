import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clerk_user_id, email, full_name, company_name } = await req.json();

    if (!clerk_user_id || !email) {
      return new Response(
        JSON.stringify({ error: "clerk_user_id and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the Clerk user exists using Clerk Backend API
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      return new Response(
        JSON.stringify({ error: "Clerk secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clerkResponse = await fetch(
      `https://api.clerk.com/v1/users/${clerk_user_id}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!clerkResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Clerk user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists by clerk_id
    const { data: existingByClerk } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerk_user_id)
      .maybeSingle();

    if (existingByClerk) {
      return new Response(
        JSON.stringify({ user: existingByClerk }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user exists by email (might be an existing Supabase auth user)
    const { data: existingByEmail } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existingByEmail) {
      // Link existing user to Clerk
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({ clerk_id: clerk_user_id })
        .eq("id", existingByEmail.id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to link Clerk user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ user: updatedUser }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user - handle company if provided
    let companyId: string | null = null;
    if (company_name) {
      const { data: companyData } = await supabase
        .from("companies")
        .insert({ name: company_name, contact_email: email })
        .select()
        .single();

      if (companyData) {
        companyId = companyData.id;
      }
    }

    // Create new user record
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerk_user_id,
        email,
        full_name: full_name || email.split("@")[0],
        role: "user",
        company_id: companyId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create user", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ user: newUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
