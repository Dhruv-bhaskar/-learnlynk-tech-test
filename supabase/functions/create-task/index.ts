import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTaskRequest {
  application_id: string;
  task_type: string;
  due_at: string;
  title?: string;
  description?: string;
}

interface TaskResponse {
  success: boolean;
  task_id?: string;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Method not allowed. Use POST." 
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let requestBody: CreateTaskRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON in request body" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { application_id, task_type, due_at, title, description } = requestBody;

    // Validation: Check required fields
    if (!application_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required field: application_id" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!task_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required field: task_type" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!due_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required field: due_at" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation: task_type must be 'call', 'email', or 'review'
    const validTaskTypes = ["call", "email", "review"];
    if (!validTaskTypes.includes(task_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid task_type. Must be one of: ${validTaskTypes.join(", ")}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation: due_at must be a valid future timestamp
    const dueAtDate = new Date(due_at);
    const now = new Date();

    if (isNaN(dueAtDate.getTime())) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid due_at format. Must be a valid ISO 8601 timestamp" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (dueAtDate <= now) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "due_at must be in the future" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, verify that the application exists
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Application not found" 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert the task into the database
    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        application_id,
        tenant_id: application.tenant_id,
        type: task_type,
        title: title || `${task_type.charAt(0).toUpperCase() + task_type.slice(1)} task`,
        description: description || null,
        due_at: due_at,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create task: " + insertError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Emit a Supabase Realtime broadcast event
    try {
      const channel = supabase.channel(`tasks:${application.tenant_id}`);
      await channel.send({
        type: "broadcast",
        event: "task.created",
        payload: {
          task_id: task.id,
          application_id: task.application_id,
          task_type: task.type,
          due_at: task.due_at,
          created_at: task.created_at,
        },
      });
    } catch (broadcastError) {
      // Log but don't fail the request if broadcast fails
      console.error("Realtime broadcast error:", broadcastError);
    }

    // Return success response
    const response: TaskResponse = {
      success: true,
      task_id: task.id,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});