import { useEffect, useState } from "react";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../utils/store";
import { getUserProfile } from "../../utils/repo";

export const Authenticator = () => {
  const [visible, setVisible] = useState(false);

  const { auth, setAuth, setUser, user } = useStore(
    useShallow((state) => ({
      auth: state.auth,
      setAuth: state.setAuth,
      setUser: state.setUser,
      user: state.user,
    }))
  );

  useEffect(() => {
    getProfile();
  }, [auth.token]);

  const getProfile = async () => {
    const user = await getUserProfile(auth.token);
    console.log(user, "GITHUB USER");
    if (user) {
      setUser({
        name: user.name || "",
        avatar_url: user.avatar_url || "",
        login: user.login || "",
      });
    }
  };

  return (
    <>
      <Button className="button-medium" onClick={() => setVisible(true)}>
        <div className="flex-x gap-small align-center">
          <span className="padding-small">
            {user.login ? user.login : "Authenticate"}
          </span>
          {user.avatar_url && (
            <img
              className="box-50 rounded-50"
              src={user.avatar_url}
              alt="User avatar"
            />
          )}
        </div>
      </Button>
      <Modal visible={visible} close={() => setVisible(false)}>
        <div className="flex-y gap-small">
          <h2 className="text-center">Authenticate</h2>

          <h4>GitHub token</h4>
          <div className="flex-x gap-big justify-between">
            <section className="flex-y gap-small">
              <input
                id="token"
                type="text"
                placeholder="Enter your GitHub token with Repo permissions"
                value={auth.token}
                onChange={(e) => setAuth({ ...auth, token: e.target.value })}
              />
              <span className="text-small">
                You can generate a token{" "}
                <a
                  target="_blank"
                  href="https://github.com/settings/tokens/new"
                >
                  here
                </a>
                . Make sure to select all the "Repo" permissions.
              </span>
            </section>
            {user.avatar_url && (
              <section>
                <div className="flex-y gap-small align-center justify-center">
                  <img
                    className="box-50 rounded-50"
                    src={user.avatar_url}
                    alt="User avatar"
                  />
                  <h3>{user.login}</h3>
                </div>
              </section>
            )}
          </div>

          <hr className="separator-large" />
          <h4>Rigobot token</h4>
          <input
            id="rigobot_token"
            type="text"
            placeholder="Enter your Rigobot token"
            value={auth.rigobot_token}
            onChange={(e) =>
              setAuth({ ...auth, rigobot_token: e.target.value })
            }
          />
          <Button className="padding-medium" onClick={() => setVisible(false)}>
            Finish
          </Button>
        </div>
      </Modal>
    </>
  );
};
