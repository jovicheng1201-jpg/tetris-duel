import { useTranslation } from "react-i18next";
import type { GameInput } from "../game/engine/types";

type Props = {
  onPress: (input: GameInput) => void;
  onRelease: (input: GameInput) => void;
  disabled?: boolean;
};

export default function TouchControls({ onPress, onRelease, disabled = false }: Props) {
  const { t } = useTranslation();
  const button = (input: GameInput, label: string, icon: string, repeat = false) => (
    <button
      key={input}
      type="button"
      className={"touch-button " + (repeat ? "touch-repeat" : "")}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(input);
      }}
      onPointerUp={() => onRelease(input)}
      onPointerCancel={() => onRelease(input)}
      onLostPointerCapture={() => onRelease(input)}
      onClick={(event) => {
        if (event.detail === 0) onPress(input);
      }}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );

  return (
    <section className="touch-controls" aria-label={t("game.touchControls")}>
      <div className="touch-movement">
        {button("left", t("game.moveLeft"), "←", true)}
        {button("right", t("game.moveRight"), "→", true)}
        {button("soft_drop", t("game.softDrop"), "↓", true)}
      </div>
      <div className="touch-actions">
        {button("rotate_ccw", t("game.rotateLeft"), "↶")}
        {button("hold", t("game.holdPiece"), "H")}
        {button("rotate_cw", t("game.rotateRight"), "↻")}
        {button("hard_drop", t("game.hardDrop"), "⇊")}
      </div>
    </section>
  );
}
