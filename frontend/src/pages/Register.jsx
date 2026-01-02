import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const defaultValues = {
  name: "",
  email: "",
  password: "",
  role: "student",
  location: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

export const Register = () => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });

  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  const [geoError, setGeoError] = useState("");
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    alert("PAGE LOADED V3: If you see this, the code is updated!");
  }, []);

  const onSubmit = async (values) => {
    setRegisterError("");
    const payload = {
      ...values,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
    };
    try {
      await registerUser(payload);
      // DEBUG: Alert on success
      alert("Registration Successful! Logging in...");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration error:", error);
      let debugMsg = "Unknown Error";

      if (error.response) {
        // Backend returned an error response
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Handle Pydantic validation errors (array of objects)
          const messages = detail.map(err => {
            const field = err.loc[err.loc.length - 1]; // Get the field name
            return `${field}: ${err.msg}`;
          }).join('\n');
          setRegisterError(messages);
          debugMsg = messages;
        } else {
          setRegisterError(detail || "Registration failed.");
          debugMsg = detail || "Registration failed.";
        }
      } else if (error.request) {
        // Request was made but no response received
        setRegisterError("Network error: Could not reach the server. Please check if the backend is running.");
        debugMsg = "Network error: Connection refused or timed out.";
      } else {
        // Something happened in setting up the request
        setRegisterError(error.message || "Registration failed.");
        debugMsg = error.message;
      }

      // CRITICAL: Force alert on mobile
      alert("REGISTRATION FAILED:\n" + debugMsg);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoError("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoError("");
        setGeoEnabled(true);
        setValue("latitude", position.coords.latitude.toFixed(6));
        setValue("longitude", position.coords.longitude.toFixed(6));
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGeoError(error.message || "Unable to fetch your location. Please enter it manually.");
        setGeoEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onError = (errors) => {
    // CRITICAL: Alert user if form is invalid locally
    const errorMsg = Object.values(errors).map(e => e.message || "Invalid field").join("\n");
    alert("FORM VALIDATION FAILED:\n" + errorMsg);
    console.error("Form errors:", errors);
  };

  return (
    <div className="page auth-page">
      <div className="card">
        <h2>Create account</h2>
        <p>Teach, learn, and collaborate with mentorship-ready tools.</p>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit, onError)}>
          {registerError && <div className="alert alert-danger" style={{ color: 'red', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{registerError}</div>}
          <div className="form-control">
            <label htmlFor="name">Full name</label>
            <input id="name" placeholder="Jane Doe" {...register("name", { required: "Name is required" })} />
            {errors.name && <small className="error">{errors.name.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@email.com" {...register("email", { required: "Email is required" })} />
            {errors.email && <small className="error">{errors.email.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min 6 characters"
              {...register("password", { required: "Password is required", minLength: 6 })}
            />
            {errors.password && <small className="error">{errors.password.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="role">Role</label>
            <select id="role" {...register("role", { required: true })}>
              <option value="student">Student</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>
          <div className="form-control">
            <label htmlFor="location">Location</label>
            <input id="location" placeholder="City or remote" {...register("location", { required: "Location is required" })} />
            {errors.location && <small className="error">{errors.location.message}</small>}
          </div>
          <div className="location-panel">
            <div>
              <strong>Enable precise location</strong>
              <p>Use GPS to auto-fill your latitude & longitude for better nearby recommendations.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleDetectLocation}>
              {geoEnabled ? "Location Enabled" : "Enable Location"}
            </button>
          </div>
          {geoError && <small className="error">{geoError}</small>}
          <div className="location-grid">
            <div className="form-control">
              <label htmlFor="city">City / District</label>
              <input id="city" placeholder="e.g., Bengaluru" {...register("city", { required: "City is required" })} />
              {errors.city && <small className="error">{errors.city.message}</small>}
            </div>
            <div className="form-control">
              <label htmlFor="state">State</label>
              <input id="state" placeholder="e.g., Karnataka" {...register("state")} />
            </div>
            <div className="form-control">
              <label htmlFor="latitude">Latitude</label>
              <input id="latitude" placeholder="12.9716" {...register("latitude")} readOnly />
            </div>
            <div className="form-control">
              <label htmlFor="longitude">Longitude</label>
              <input id="longitude" placeholder="77.5946" {...register("longitude")} readOnly />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;

