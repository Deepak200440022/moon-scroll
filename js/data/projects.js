/* Explore Beyond — the portfolio content.
   Edit this file to change the projects on the shard cards and the
   final page. Everything else in the experience is driven from here.
   shot = a screenshot of the running project (site-root relative);
   the slab's glass face paints it in when it loads, and the hover
   card shows it on top. Projects without a shot keep the procedural
   glass face. */

var PROJECTS = [
  {
    name: "Single-Image 3D Reconstruction",
    label: "3D Reconstruction",
    desc: "Turns one RGB photo into a 3D point cloud and surface mesh using MiDaS v3.1 DPT monocular depth estimation — a 7-stage geometry pipeline (depth, normals, Poisson surfacing, decimation) with a CLI and a Flask web app.",
    tags: ["PyTorch", "MiDaS", "OpenCV", "Flask"],
    url: "https://github.com/Deepak200440022/web_app_3d_img",
    shot: "assets/shots/web3d.webp"
  },
  {
    name: "Database Assistant",
    label: "Database Assistant",
    desc: "Ask a database in plain English, get answers backed by real SQL. An LLM writes the query, an extract / validate / mutation-guard stage screens it, and the results come back as a natural-language answer. FastAPI service with pluggable LLM and database providers.",
    tags: ["FastAPI", "LLM", "SQL", "Python"],
    url: "https://github.com/Deepak200440022/Database_Assistant",
    shot: "assets/shots/dbassistant.webp"
  },
  {
    name: "OMR Answer Sheet Reader",
    label: "OMR Scanner",
    desc: "A 5-stage OpenCV pipeline that scans, aligns and reads OMR answer sheets — bubble detection via contour circularity, robust to noise, warping and perspective distortion.",
    tags: ["OpenCV", "NumPy", "SciPy"],
    url: "https://github.com/Deepak200440022/OMR_scanner",
    shot: "assets/shots/omr.webp"
  },
  {
    name: "Real-Time Face Mask Detection",
    label: "Face Mask Detection",
    desc: "Real-time video inference with a CNN / MobileNet classifier and two face-detection backends (Haar Cascade and DNN) running on live camera streams.",
    tags: ["OpenCV", "TensorFlow", "MobileNet"],
    url: "https://github.com/Deepak200440022/SKILLTEXON/tree/main/mask_detection",
    shot: "assets/shots/mask.webp"
  },
  {
    name: "Blogify — Tiny Blog Platform",
    label: "Tiny Blog",
    desc: "A minimal blog platform: public users read and search posts, admins create, edit and delete them. Django views with Tailwind CSS and conditional rendering for role-based controls.",
    tags: ["Django", "Tailwind", "Python"],
    url: "https://github.com/Deepak200440022/tiny-blog",
    shot: "assets/shots/tinyblog.webp"
  },
  {
    name: "Keyboard Drumkit",
    label: "Keyboard Drumkit",
    desc: "A browser drumkit in vanilla JavaScript — nine keys (A–L) each trigger a drum sound, with live key-tap feedback. No frameworks, no build step: one HTML page, one style sheet, one script.",
    tags: ["JavaScript", "HTML", "CSS"],
    url: "https://github.com/Deepak200440022/keyboard_drumkit",
    shot: "assets/shots/drumkit.webp"
  }
];

var FINAL_TAG = "EXPLORE BEYOND";
var FINAL_NAME = "Deepak Sharma";
var FINAL_SUB = "AI/ML Engineer — computer vision, deep learning & applied AI";
var FINAL_META = "AI/ML Engineer @ Global Infoventures · B.Tech CSE · CGPA 8.3 · Oracle Certified GenAI Professional";
var FINAL_LINKS = [
  { label: "All Projects", href: "#", scrollTo: 0.60 }, // smooth-scrolls back to the shard flythrough
  { label: "Contact",      href: "mailto:deepak20044002@gmail.com" },
  { label: "GitHub",       href: "https://github.com/Deepak200440022" },
  { label: "Resume",       href: "resume.pdf" }
];

export const data = {
  PROJECTS: PROJECTS,
  FINAL_TAG: FINAL_TAG,
  FINAL_NAME: FINAL_NAME,
  FINAL_SUB: FINAL_SUB,
  FINAL_META: FINAL_META,
  FINAL_LINKS: FINAL_LINKS
};
