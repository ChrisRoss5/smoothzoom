type ActivationKey = "rightClick" | "altKey" | "ctrlKey" | "shiftKey";

interface ChromeStorage {
  activationKey: ActivationKey;
  websiteInteractivity: boolean;
  followCursor: boolean;
  holdToZoom: boolean;
  useScreenshot: boolean;
  strength: number;
  transition: number;
}

type DefaultStorage = {
  activationKey: "rightClick";
  websiteInteractivity: true;
  followCursor: true;
  holdToZoom: true;
  useScreenshot: false;
  strength: 0.5;
  transition: 200;
};
