import { useEffect } from "react";
import { useStore } from "../../utils/store";
import { Authenticator } from "../Authenticator/Authenticator";
import { useShallow } from "zustand/react/shallow";

export const Navbar = () => {
  const { initialized, init } = useStore(
    useShallow((state) => ({
      initialized: state.initialized,
      init: state.init,
    }))
  );

  useEffect(() => {
    init();
  }, []);

  if (!initialized) return null;

  return (
    <div className="flex-x justify-between align-center padding-large bg-secondary">
      <h2>RepoScanner</h2>
      <Authenticator />
    </div>
  );
};
