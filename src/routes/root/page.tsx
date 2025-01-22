import { useState } from "react";

import { StorageManager } from "../../utils/storage";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { Navbar } from "../../components/Navbar/Navbar";
import { Button } from "../../components/Button/Button";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../utils/store";

const isCached = (githubUrl: string) => {
  return StorageManager.get(`repo-${githubUrl}`);
};

export default function Root() {
  const navigate = useNavigate();
  const { setRepo, fetchRepo } = useStore(
    useShallow((state) => ({
      setRepo: state.setRepo,
      fetchRepo: state.fetchRepo,
    }))
  );
  const [githubUrl, setGithubUrl] = useState<string>("");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const githubUrl = e.currentTarget.githubUrl.value;
    const tid = toast.loading("Loading repo...");

    if (isCached(githubUrl)) {
      setRepo(isCached(githubUrl));
      navigate(`/repo/${btoa(githubUrl)}`);
      toast.success("Cached repo loaded", {
        id: tid,
      });

      return;
    }

    await fetchRepo(githubUrl);

    navigate(`/repo/${btoa(githubUrl)}`);
    toast.success("Repo loaded for first time", {
      id: tid,
    });
  };

  const handleDeleteCache = () => {
    StorageManager.remove(`repo-${githubUrl}`);
    toast.success("Cache deleted");
  };

  return (
    <div>
      <Navbar />
      <div className="flex-y gap-small padding-large">
        <form onSubmit={handleSubmit} className="flex-y gap-small">
          <h3>Load a repo</h3>
          <input
            type="text"
            name="githubUrl"
            className="w-100"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
          <div className="flex-x gap-medium">
            <Button className="padding-medium" type="submit">
              Submit
            </Button>
            {githubUrl && isCached(githubUrl) && (
              <Button className="padding-medium" onClick={handleDeleteCache}>
                Delete cache
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
