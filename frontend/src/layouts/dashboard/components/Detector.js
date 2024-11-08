import { useState, useEffect, useRef } from "react";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "../utils/loader";
import { detectImage } from "../utils/detect";
import { download } from "../utils/download";

import MDButton from "components/MDButton";

const Detector = () => {
  const [session, setSession] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState({
    text: "",
    progress: null,
  });
  const timeRef = useRef(null);
  const inputImage = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Configs
  const modelName = "yolov10n.onnx";
  const modelInputShape = [1, 3, 640, 640];
  const scoreThreshold = 0.2;

  useEffect(() => {
    const init = async () => {
      const baseModelURL = `${window.location.href}/model`;
      // create session
      const arrBufNet = await download(
        `${baseModelURL}/${modelName}`, // url
        ["Loading YOLOv10 Detection model", setLoading] // logger
      );
      const yolov10 = await InferenceSession.create(arrBufNet);
      const prepBuf = await download(
        `${baseModelURL}/preprocess-yolo.onnx`, // url
        ["Loading Preprocessing model", setLoading] // logger
      );
      const prep = await InferenceSession.create(prepBuf);

      // warmup main model
      setLoading({ text: "Warming up model...", progress: null });
      const tensor = new Tensor(
        "float32",
        new Float32Array(modelInputShape.reduce((a, b) => a * b)),
        modelInputShape
      );
      await yolov10.run({ images: tensor });

      setSession({ net: yolov10, prep: prep });
      setLoading(null);
    }

    init();
  }, []);

  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress
            ? `${loading.text} - ${loading.progress}%`
            : loading.text}
        </Loader>
      )}

      {image && (
        <div className="inference-time-container">
          <code className="code" ref={timeRef}></code>
        </div>
      )}

      <div className="content">
        <img
          ref={imageRef}
          src="#"
          alt=""
          style={{ display: image ? "block" : "none" }}
          onLoad={() => {
            detectImage(
              image,
              canvasRef.current,
              session,
              scoreThreshold,
              modelInputShape,
              timeRef.current
            );
          }}
        />
        <canvas
          id="canvas"
          ref={canvasRef}
        />
      </div>

      <input
        type="file"
        ref={inputImage}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          // handle next image to detect
          if (image) {
            URL.revokeObjectURL(image);
            setImage(null);
          }

          const url = URL.createObjectURL(e.target.files[0]); // create image url
          imageRef.current.src = url; // set image source
          setImage(url);
        }}
      />
      <div className="btn-container">
        <MDButton
          onClick={() => {
            inputImage.current.click();
          }}
          color="dark"
        >
          Open local image
        </MDButton>
        {image && (
          /* show close btn when there is image */
          <MDButton
            onClick={() => {
              timeRef.current.innerText = ""
              inputImage.current.value = "";
              imageRef.current.src = "#";
              URL.revokeObjectURL(image);
              setImage(null);

              // clean up canvas
              const ctx = canvasRef.current.getContext("2d");
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clear canvas
            }}
            color="secondary"
          >
            Close image
          </MDButton>
        )}
      </div>
    </div>
  );
};

export default Detector;
