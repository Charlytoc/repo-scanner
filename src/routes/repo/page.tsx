import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  FileSystem,
  TFileSystemItem,
} from "../../components/FileSystem/FileSystem";
import { StorageManager } from "../../utils/storage";
import { useStore } from "../../utils/store";
import { useShallow } from "zustand/shallow";

const getOwnerFromUrl = (url: string) => {
  const urlObj = new URL(url);
  const owner = urlObj.pathname.split("/")[1];
  return owner;
};

export default function Repo() {
  const { repoUrlB64 } = useParams();
  const { setRepo } = useStore(
    useShallow((state) => ({
      setRepo: state.setRepo,
    }))
  );

  if (!repoUrlB64) return null;

  const repoUrl = atob(repoUrlB64);
  const [repoMap, setRepoMap] = useState<TFileSystemItem[]>([]);

  useEffect(() => {
    const cachedRepoMap = StorageManager.get(`repoMap-${repoUrl}`);
    if (cachedRepoMap) {
      setRepoMap(cachedRepoMap);
    }
    setRepo({
      owner: getOwnerFromUrl(repoUrl),
      url: repoUrl,
      branch: "master",
    });
  }, [repoUrl, setRepo]);

  return <FileSystem repoMap={repoMap} />;
}
