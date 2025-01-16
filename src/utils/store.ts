import { create } from "zustand";

type ChangedFile = {
  path: string;
  content: string;
};

type TAuth = {
  token: string;
  rigobot_token: string;
};

type Store = {
  auth: TAuth;
  repo: {
    owner: string;
    url: string;
    branch: string;
  };
  changedFiles: {
    edit: ChangedFile[];
    create: ChangedFile[];
    delete: ChangedFile[];
  };
  files: {
    [key: string]: string;
  };
  setAuth: (auth: TAuth) => void;
  setRepo: (repo: { owner: string; url: string; branch: string }) => void;
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
  },
  changedFiles: {
    edit: [],
    create: [],
    delete: [],
  },
  files: {},
  setAuth: (auth) => set({ auth }),
  setRepo: (repo) => set({ repo }),
  setChangedFiles: (changedFiles) => set({ changedFiles }),
}));
