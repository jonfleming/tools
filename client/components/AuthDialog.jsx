import React, { useEffect } from "react";
import PropTypes from 'prop-types';
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";
export default function AuthDialog({ onClose, supabaseUrl, supabaseAnonKey }) {
  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    // Set up the auth state change listener outside the render function
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);

      if (event === "SIGNED_IN" && session) {
        console.log("User signed in:", session.user);
        
        const fullName = session.user.user_metadata?.full_name || 
        session.user.user_metadata?.name ||
        session.user.user_metadata?.preferred_username ||
        'Unknown';
        onClose(session.user.email, fullName);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, onClose]);

  // Determine the redirect URL safely
  const redirectUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl mb-4">Authentication</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["github", "google"]}
          theme="dark"
          redirectTo={redirectUrl} // Explicitly set redirect URL
        />
      </div>
    </div>
  );
}

AuthDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  supabaseUrl: PropTypes.string.isRequired,
  supabaseAnonKey: PropTypes.string.isRequired,
};