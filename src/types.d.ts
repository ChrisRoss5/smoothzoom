type ActivationKey = "rightClick" | "altKey" | "ctrlKey" | "shiftKey";

interface ChromeStorage {
  activationKey: ActivationKey;
  usePointerEvents: boolean;
  useDoubleClick: boolean;
  useCanvas: boolean;
  strength: number;
}

type DefaultStorage = {
  activationKey: "rightClick",
  usePointerEvents: true,
  useDoubleClick: false,
  useCanvas: false,
  strength: 1
};