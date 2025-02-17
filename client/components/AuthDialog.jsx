import React, { useState, useEffect, useRef } from "react"; // Add useRef import
import PropTypes from 'prop-types';

export default function AuthDialog({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const emailInputRef = useRef(null); // Add ref for email input

  useEffect(() => {
    // Focus the email input when component mounts
    emailInputRef.current?.focus();

    const queryParams = new URLSearchParams(window.location.search);
    const verified = queryParams.get('verified');
    
    if (verified === 'true') {
      setError("Email verified successfully! You can now sign in.");
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleResendConfirmation = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await fetch("/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setError("Confirmation email has been resent. Please check your inbox.");
      } else {
        setError(data.error || "Failed to resend confirmation email");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleSignUp = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log("User signed up:", data.user);
        setError("Please check your email to verify your account.");
        setIsAwaitingVerification(true);
      } else {
        setError(data.error || "Failed to sign up");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleSignIn = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await fetch("/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const {user} = await response.json();
      if (response.ok) {
        console.log("User signed in:", user);
        onClose(user.email);
      } else {
        setError(data.error || "Failed to sign in");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl mb-4">Authentication</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <input
          ref={emailInputRef} // Add ref to email input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSignUp}
            className="bg-blue-500 text-white p-2 rounded flex-1 hover:bg-blue-600"
          >
            Sign Up
          </button>
          <button
            onClick={handleSignIn}
            className="bg-blue-500 text-white p-2 rounded flex-1 hover:bg-blue-600"
          >
            Sign In
          </button>
        </div>
        {isAwaitingVerification && (
          <button
            onClick={handleResendConfirmation}
            className="mt-4 w-full p-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Resend confirmation email
          </button>
        )}
      </div>
    </div>
  );
}

AuthDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
};