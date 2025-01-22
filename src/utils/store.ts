import { create } from "zustand";
import { StorageManager } from "./storage";
import { TFileSystemItem } from "../components/FileSystem/FileSystem";
import { getOwnerFromUrl } from "./repo";
import { getBranches } from "./repo";
import { buildRepoMap } from "./repo";

type ChangedFile = {
  path: string;
  content: string;
};

type TAuth = {
  token: string;
  rigobot_token: string;
};

type TUser = {
  name: string;
  // email: string;
  avatar_url: string;
  login: string;
};

type TRepo = {
  owner: string;
  url: string;
  branch: string;
  files: TFileSystemItem[];
  branches: { name: string; commit: { sha: string; url: string } }[];
};

type Store = {
  auth: TAuth;
  repo: TRepo;
  changedFiles: {
    edit: ChangedFile[];
    create: ChangedFile[];
    delete: ChangedFile[];
  };
  files: {
    [key: string]: string;
  };
  user: TUser;
  init: () => void;
  initialized: boolean;
  setUser: (user: TUser) => void;
  setAuth: (auth: TAuth) => void;
  setRepo: (repo: TRepo) => void;
  fetchRepo: (repoUrl: string) => void;
  setChangedFiles: (changedFiles: {
    edit: ChangedFile[];
    create: ChangedFile[];
    delete: ChangedFile[];
  }) => void;
};

export const useStore = create<Store>()((set, get) => ({
  auth: {
    token: "",
    rigobot_token: "",
  },
  repo: {
    owner: "",
    url: "",
    branch: "",
    files: [],
    branches: [],
  },
  changedFiles: {
    edit: [],
    create: [],   
    delete: [],
  },
  user: {
    name: "",
    avatar_url: "",
    login: "",
  },
  files: {},
  initialized: false,
  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    const auth = StorageManager.get("auth");
    if (auth) {
      set({ auth });
    }
  },
  setUser: (user) => set({ user }),
  setAuth: (auth) => {
    set({ auth });
    StorageManager.set("auth", auth);
  },
  setRepo: (repo) => set({ repo }),
  fetchRepo: async (repoUrl) => {
    const { auth } = get();

    const repoMap = await buildRepoMap({
      githubUrl: repoUrl,
      token: auth.token,
    });

    const branches = await getBranches({
      repoUrl,
      token: auth.token,
    });

    const _repo = {
      owner: getOwnerFromUrl(repoUrl),
      url: repoUrl,
      branch: branches[0].name,
      files: repoMap,
      branches,
    };

    set({ repo: _repo });
    StorageManager.set(`repo-${repoUrl}`, _repo);
    return _repo;
  },
  setChangedFiles: (changedFiles) => set({ changedFiles }),
}));
