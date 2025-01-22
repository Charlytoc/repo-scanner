import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { FileSystem } from "../../components/FileSystem/FileSystem";
import { StorageManager } from "../../utils/storage";
import { useStore } from "../../utils/store";
import { useShallow } from "zustand/shallow";
import { Navbar } from "../../components/Navbar/Navbar";

export default function Repo() {
  const { repoUrlB64 } = useParams();
  const navigate = useNavigate();
  const { setRepo, repo } = useStore(
    useShallow((state) => ({
      repo: state.repo,
      setRepo: state.setRepo,
    }))
  );

  if (!repoUrlB64) return null;

  const repoUrl = atob(repoUrlB64);

  useEffect(() => {
    if (repo.owner === "" && repo.url === "") {
      const cachedRepo = StorageManager.get(`repo-${repoUrl}`);
      if (cachedRepo) {
        setRepo(cachedRepo);
      } else {
        navigate("/");
      }
    }
  }, [repoUrl, setRepo, repo]);

  return (
    <>
      <Navbar />
      <FileSystem />
    </>
  );
}
