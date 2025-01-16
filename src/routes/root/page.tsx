import { useState } from "react";

import { buildRepoMap } from "../../utils/repo";
import { StorageManager } from "../../utils/storage";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

export default function Root() {
  const navigate = useNavigate();
  // const [repoMap, setRepoMap] = useState<TFileSystemItem[]>([]);
  const [githubUrl, setGithubUrl] = useState<string>("");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const githubUrl = e.currentTarget.githubUrl.value;

    const cachedRepoMap = StorageManager.get(`repoMap-${githubUrl}`);
    if (cachedRepoMap) {
      navigate(`/repo/${btoa(githubUrl)}`);
      toast.success("Repo loaded");
      return;
    }

    const repoMap = await buildRepoMap({ githubUrl });
    // setRepoMap(repoMap);
    StorageManager.set(`repoMap-${githubUrl}`, repoMap);

    navigate(`/repo/${btoa(githubUrl)}`);
    toast.success("Repo loaded");
  };

  const handleDeleteCache = () => {
    StorageManager.remove(`repoMap-${githubUrl}`);
    toast.success("Cache deleted");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="githubUrl"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
        />
        <button type="submit">Submit</button>
        <button onClick={handleDeleteCache}>Delete cache</button>
      </form>
    </div>
  );
}
