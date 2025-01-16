import "./Modal.css";

export const Modal = ({
  children,
  close,
  visible,
}: {
  children: React.ReactNode;
  close: () => void;
  visible: boolean;
}) => {
  if (!visible) return null;

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={close}></div>
      <div className="modal-content">{children}</div>
    </div>
  );
};
