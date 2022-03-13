type ActivationKey = "rightClick" | "altKey" | "ctrlKey" | "shiftKey";

interface ChromeStorage {
  activationKey: ActivationKey;
  websiteInteractivity: boolean;
  holdToZoom: boolean;
  useCanvas: boolean;
  strength: number;
}

type DefaultStorage = {
  activationKey: "rightClick";
  websiteInteractivity: true;
  holdToZoom: true;
  useCanvas: false;
  strength: 1;
};
