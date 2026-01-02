import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { meetingApi } from "../api/api";

export const MeetingPage = () => {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const peerOneRef = useRef(null);
  const peerTwoRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      stopRecording();
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async () => {
    if (peerOneRef.current) return;
    if (!connectionId) {
      setError("A valid connection is required to start the meeting.");
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc1 = new RTCPeerConnection();
      const pc2 = new RTCPeerConnection();

      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc2.addIceCandidate(event.candidate);
        }
      };
      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc1.addIceCandidate(event.candidate);
        }
      };

      pc2.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      stream.getTracks().forEach((track) => pc1.addTrack(track, stream));

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);

      peerOneRef.current = pc1;
      peerTwoRef.current = pc2;
      setStatus("in-call");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to start the meeting.");
    }
  };

  const endCall = () => {
    stopRecording();
    peerOneRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerTwoRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerOneRef.current?.close();
    peerTwoRef.current?.close();
    peerOneRef.current = null;
    peerTwoRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setStatus("ended");
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startRecording = () => {
    if (!localStreamRef.current) {
      setError("Start the call before recording.");
      return;
    }
    setError("");
    try {
      const recorder = new MediaRecorder(localStreamRef.current, { mimeType: "video/webm;codecs=vp9" });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (!chunksRef.current.length) return;
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        try {
          const file = new File([blob], "meeting.webm", { type: "video/webm" });
          await meetingApi.upload(connectionId, file);
          alert("Recording saved");
        } catch (uploadError) {
          console.error(uploadError);
          setError(uploadError?.message || "Failed to upload recording.");
        } finally {
          setIsRecording(false);
          recorderRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to start recording.");
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card__header">
          <div>
            <h2>Live Meeting</h2>
            <p>Status: {status}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        {error && <p className="text-error">{error}</p>}
        <div className="video-grid">
          <div>
            <h4>Your video</h4>
            <video ref={localVideoRef} autoPlay muted playsInline className="video-tile" />
          </div>
          <div>
            <h4>Remote video</h4>
            <video ref={remoteVideoRef} autoPlay playsInline className="video-tile" />
          </div>
        </div>
        <div className="meeting-controls">
          <button className="btn btn-primary" onClick={startCall} disabled={!!peerOneRef.current || !connectionId}>
            Start call
          </button>
          <button className="btn btn-secondary" onClick={endCall} disabled={!peerOneRef.current}>
            End call
          </button>
          <button className="btn btn-primary" onClick={startRecording} disabled={!peerOneRef.current || isRecording}>
            {isRecording ? "Recording..." : "Start recording"}
          </button>
          <button className="btn btn-secondary" onClick={stopRecording} disabled={!isRecording}>
            Stop recording
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;

