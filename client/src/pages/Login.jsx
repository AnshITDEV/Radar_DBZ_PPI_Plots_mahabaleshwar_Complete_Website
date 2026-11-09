import { useState } from "react";
import { loginUser, registerUser } from "../api/auth";
import "../index.css";
import logo from "../assets/kjsieit-logo.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // for signup
  const [loginInput, setLoginInput] = useState(""); // username or email for login
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // toggle login/signup
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin) {
        // Login with username or email
        const data = await loginUser(loginInput, password);
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", data.username); // store username
          window.location.href = "/landing";
        } else {
          setMessage(data.msg || "Login failed");
        }
      } else {
        // Sign Up
        const data = await registerUser(username, email, password);
        if (data.msg) {
          setMessage(data.msg);
          setIsLogin(true); // switch to login after successful signup
        } else {
          setMessage("Sign up failed");
        }
      }
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  return (
    <div className="login-container">
      <img src={logo} alt="University Logo" className="login-logo" />
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        {message && <p className="message">{message}</p>}

        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        {isLogin && (
          <input
            type="text"
            placeholder="Username or Email"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            required
          />
        )}

        {!isLogin && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>

        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            className="toggle-link"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </form>
    </div>
  );
}
