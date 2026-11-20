/* Explore Beyond — the portfolio content.
   Edit this file to change the projects on the shard cards and the
   final page. Everything else in the experience is driven from here. */

var PROJECTS = [
  {
    name: "Single-Image 3D Reconstruction",
    label: "3D Reconstruction",
    desc: "Turns one RGB photo into a 3D point cloud and surface mesh using MiDaS v3.1 DPT monocular depth estimation — a 7-stage geometry pipeline with a CLI and a Flask web app.",
    tags: ["PyTorch", "MiDaS", "OpenCV", "Flask"],
    url: "https://github.com/Deepak200440022/web_app_3d_img"
  },
  {
    name: "Real-Time Face Mask Detection",
    label: "Face Mask Detection",
    desc: "Real-time video inference with a CNN / MobileNet classifier and two face-detection backends (Haar Cascade and DNN) running on live camera streams.",
    tags: ["OpenCV", "TensorFlow", "MobileNet"],
    url: "https://github.com/Deepak200440022/SKILLTEXON/tree/main/mask_detection"
  },
  {
    name: "OMR Answer Sheet Reader",
    label: "OMR Answer Reader",
    desc: "A 5-stage OpenCV pipeline that scans, aligns and reads OMR answer sheets — bubble detection via contour circularity, robust to noise, warping and perspective distortion.",
    tags: ["OpenCV", "NumPy", "SciPy"],
    url: "https://github.com/Deepak200440022/OMR_scanner"
  }
];

var FINAL_TAG = "EXPLORE BEYOND";
var FINAL_NAME = "Deepak Sharma";
var FINAL_SUB = "AI/ML Engineer";
var FINAL_LINKS = [
  { label: "All Projects", href: "#", scrollTo: 0.62 }, // smooth-scrolls back to the shard flythrough
  { label: "Contact",      href: "mailto:deepak20044002@gmail.com" },
  { label: "GitHub",       href: "https://github.com/Deepak200440022" },
  { label: "Resume",       href: "resume.pdf" }
];

export const data = {
  PROJECTS: PROJECTS,
  FINAL_TAG: FINAL_TAG,
  FINAL_NAME: FINAL_NAME,
  FINAL_SUB: FINAL_SUB,
  FINAL_LINKS: FINAL_LINKS
};
