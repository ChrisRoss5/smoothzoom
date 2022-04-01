type ActivationKey = "rightClick" | "altKey" | "ctrlKey" | "shiftKey";

interface ChromeStorage {
  activationKey: ActivationKey;
  holdToZoom: boolean;
  alwaysFollowCursor: boolean;
  disableInteractivity: boolean;
  disableJavascript: boolean; // todo-feature
  useScreenshot: boolean;
  strength: number;
  transition: number;
}

type DefaultStorage = {
  activationKey: "rightClick";
  holdToZoom: true;
  alwaysFollowCursor: true;
  disableInteractivity: false;
  disableJavascript: false;
  useScreenshot: false;
  strength: 0.5;
  transition: 200;
};
