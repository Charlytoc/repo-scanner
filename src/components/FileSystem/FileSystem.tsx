import { useEffect, useState } from "react";
import "./FileSystem.css";
import toast from "react-hot-toast";
import {
  commitMultipleFilesToGitHub,
  fetchFileContent,
  extractFrontMatter,
  insertFrontMatter,
  buildRepoMap,
} from "../../utils/repo";
import { Modal } from "../Modal/Modal";
import { Textarea } from "../Textarea/Textarea";
import { useStore } from "../../utils/store";
import { useShallow } from "zustand/shallow";
import { generateAIDescription } from "../../utils/lib";
import { Button } from "../Button/Button";
import { StorageManager } from "../../utils/storage";

const getParentDirectory = (path: string) => {
  const lastSlashIndex = path.lastIndexOf("/");
  return lastSlashIndex === -1 ? "root" : path.slice(0, lastSlashIndex);
};

type TFilters = {
  extension: string;
  directories: string[];
};

export type TFileSystemItem = {
  name: string;
  path: string;
  type: string;
  children?: TFileSystemItem[];
  download_url: string | null;
  selected: boolean;
};
export const FileSystem = ({ repoMap }: { repoMap: TFileSystemItem[] }) => {
  const [innerRepoMap, setInnerRepoMap] = useState<TFileSystemItem[]>(repoMap);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TFilters>({
    extension: "",
    directories: [],
  });

  const { repo, auth, setAuth } = useStore(
    useShallow((state) => ({
      repo: state.repo,
      auth: state.auth,
      setAuth: state.setAuth,
    }))
  );

  const handleExtensionFilter = (extension: string) => {
    const filteredRepoMap = repoMap.filter((item) =>
      item.name.endsWith(extension)
    );
    setInnerRepoMap(filteredRepoMap);
  };

  const groupByParentDirectory = (items: TFileSystemItem[]) => {
    const grouped: Record<string, TFileSystemItem[]> = {};

    items.forEach((item) => {
      const lastSlashIndex = item.path.lastIndexOf("/");
      const groupKey =
        lastSlashIndex === -1 ? "root" : item.path.slice(0, lastSlashIndex);
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      grouped[groupKey].push(item);
    });

    return grouped;
  };
  const renderGroupedItems = (
    groupedItems: Record<string, TFileSystemItem[]>
  ) => {
    return Object.entries(groupedItems).map(([group, items]) => (
      <div key={group} className="flex-y gap-small">
        <h3 className="directory-name">{group}</h3>
        <div className="flex-y gap-small">
          {items.map((item) => (
            <FileSystemItem
              key={item.path}
              item={item}
              onSelect={() => {
                setInnerRepoMap((prev) =>
                  prev.map((i) => {
                    if (i.path === item.path) {
                      return {
                        ...i,
                        selected: !i.selected,
                      };
                    }
                    return i;
                  })
                );
              }}
            />
          ))}
        </div>
      </div>
    ));
  };

  useEffect(() => {
    setInnerRepoMap(repoMap);
  }, [repoMap]);

  useEffect(() => {
    let filteredRepoMap = repoMap.filter((item) => {
      return filters.directories.includes(getParentDirectory(item.path));
    });
    if (filters.extension) {
      filteredRepoMap = filteredRepoMap.filter((item) =>
        item.name.endsWith(filters.extension)
      );
    }
    setInnerRepoMap(filteredRepoMap);
  }, [filters]);

  const remakeRepoMap = async () => {
    const toastId = toast.loading("Syncing repo...");
    const repoMap = await buildRepoMap({ githubUrl: repo.url });
    setInnerRepoMap(repoMap);
    StorageManager.set(`repoMap-${repo.url}`, repoMap);
    toast.success("Repo synced", { id: toastId });
  };

  const handleSelectDirectory = (directory: string) => {
    const newFilters = {
      ...filters,
      directories: filters.directories.includes(directory)
        ? filters.directories.filter((d) => d !== directory)
        : [...filters.directories, directory],
    };
    setFilters(newFilters);
  };

  const groupedRepoMap = groupByParentDirectory(innerRepoMap);

  return (
    <div className="flex-y gap-small">
      <div className="flex-y gap-small padding-large">
        <h1>RepoScanner</h1>
        <div>
          <p>
            <a href={repo.url} target="_blank">
              {repo.owner}/{getRepoSectionFromUrl(repo.url).repo}
            </a>
            <span className="text-muted padding-small">
              {repo.branch || "unknown branch"}
            </span>
            <Button onClick={remakeRepoMap}>
              <p>Reload</p>
            </Button>
          </p>
          <input
            type="text"
            placeholder="Token"
            value={auth.token}
            onChange={(e) => setAuth({ ...auth, token: e.target.value })}
          />
          <input
            type="text"
            placeholder="Rigobot token"
            value={auth.rigobot_token}
            onChange={(e) =>
              setAuth({ ...auth, rigobot_token: e.target.value })
            }
          />
        </div>
        {showFilters && (
          <div className="flex-y gap-small bordered padding-large rounded-small">
            <h3 className="text-center">Filters</h3>
            <h4>By extension</h4>
            <input
              type="text"
              name="extensionFilter"
              placeholder="Extension"
              onBlur={(e) => handleExtensionFilter(e.target.value)}
            />
            <h4>Directories</h4>
            <div className="flex-x gap-small wrap-wrap">
              {Object.keys(groupByParentDirectory(repoMap)).map((key) => (
                <button
                  className={`${
                    filters.directories.includes(key) ? "bg-accent" : ""
                  }`}
                  key={key}
                  onClick={() => handleSelectDirectory(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-x gap-small justify-center">
        <button onClick={() => setInnerRepoMap(repoMap)}>Reset</button>
        <button
          onClick={() => {
            setInnerRepoMap(
              innerRepoMap.map((item) => ({ ...item, selected: true }))
            );
          }}
        >
          Select all current items
        </button>
        <button
          onClick={() => {
            setInnerRepoMap(
              innerRepoMap.map((item) => ({ ...item, selected: false }))
            );
          }}
        >
          Select none
        </button>
        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? "Hide filters" : "Show filters"}
        </button>
      </div>

      <div className="flex-y gap-small padding-large">
        <BulkActions
          key={innerRepoMap.filter((item) => item.selected).length}
          selectedItems={innerRepoMap.filter((item) => item.selected)}
        />
        {renderGroupedItems(groupedRepoMap)}
      </div>
    </div>
  );
};

const FileSystemItem = ({
  item,
  onSelect,
}: {
  item: TFileSystemItem;
  onSelect: () => void;
}) => {
  // if (item.type === "dir") {
  //   return <Directory item={item} />;
  // }
  return <File item={item} onSelect={onSelect} />;
};

// export const Directory = ({ item }: { item: TFileSystemItem }) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div className="directory">
//       <button onClick={() => setIsOpen(!isOpen)}>{item.name}</button>
//       {isOpen && (
//         <div>
//           {item.children?.map((child) => (
//             <FileSystemItem key={child.path} item={child} />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

export const File = ({
  item,
  onSelect,
}: {
  item: TFileSystemItem;
  onSelect: () => void;
}) => {
  const [content, setContent] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {}, [item.download_url]);

  const handleEdit = () => {
    if (!content) {
      fetchFileContent(item.download_url || "").then((content) => {
        setContent(content);
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  return (
    <div className={`flex-x gap-small align-center`}>
      <div
        className={`box-20 rounded-small ${item.selected ? "bg-accent" : ""}`}
        onClick={onSelect}
      ></div>
      <p>{item.name}</p>
      {item.download_url && (
        <div className="flex-x gap-small">
          <button
            onClick={() => window.open(item.download_url || "", "_blank")}
            disabled={!item.download_url}
          >
            Open
          </button>
          <button onClick={handleEdit}>Edit</button>
          <Modal visible={visible} close={() => setVisible(false)}>
            <Editor
              name={item.name}
              path={item.path}
              content={content}
              onChange={(content) => setContent(content)}
              onSave={() => setVisible(false)}
            />
          </Modal>
        </div>
      )}
    </div>
  );
};

const getRepoSectionFromUrl = (url: string) => {
  if (!url) return { owner: "", repo: "" };

  const urlObj = new URL(url);
  const owner = urlObj.pathname.split("/")[1];
  const repo = urlObj.pathname.split("/")[2];
  return { owner, repo };
};

const Editor = ({
  content,
  onChange,
  onSave,
  path,
  name,
}: {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  path: string;
  name: string;
}) => {
  const { auth, repo, setAuth } = useStore(
    useShallow((state) => ({
      auth: state.auth,
      repo: state.repo,
      setAuth: state.setAuth,
      setRepo: state.setRepo,
    }))
  );

  const [innerContent, setInnerContent] = useState(content);
  const [commitMessage, setCommitMessage] = useState("");

  const handleCommit = () => {
    const toastId = toast.loading("Committing file...");
    commitMultipleFilesToGitHub({
      owner: repo.owner || "",
      repo: getRepoSectionFromUrl(repo.url).repo || "",
      branch: repo.branch || "",
      files: [{ path: path, content: innerContent }],
      message: commitMessage,
      token: auth.token,
    });
    toast.success("File committed", { id: toastId });
  };

  return (
    <div className="editor flex-y gap-small">
      <div className="flex-y gap-small">
        <h2 className="text-center">{name}</h2>
        <h5>{path}</h5>
      </div>
      <div className="flex-y gap-small">
        {/* <h3>Frontmatter</h3>
        <div className="flex-y gap-small">
          {
            // @ts-ignore
            Object.entries(parseMarkdownFile(content).frontmatter).map(
              ([key, value]) => (
                <div key={key}>
                  <p>
                    {key}: {String(value)}
                  </p>
                </div>
              )
            )
          }
        </div> */}
        <Textarea
          defaultValue={content}
          onChange={(newContent) => {
            setInnerContent(newContent);
            onChange(newContent);
          }}
        />
        <input
          type="text"
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Token"
          value={auth.token}
          onChange={(e) => setAuth({ ...auth, token: e.target.value })}
        />
      </div>
      <div className="flex-x gap-small justify-center">
        <button onClick={onSave}>Save</button>
        <button onClick={handleCommit}>Commit</button>
      </div>
    </div>
  );
};

const BulkActions = ({
  selectedItems,
}: {
  selectedItems: TFileSystemItem[];
}) => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const { auth, repo } = useStore(
    useShallow((state) => ({
      auth: state.auth,
      repo: state.repo,
    }))
  );

  const handleGenerateDescription = async () => {
    console.log("selectedItems", selectedItems);

    const files = await Promise.all(
      selectedItems.map(async (item) => {
        const originalContent = await fetchFileContent(item.download_url || "");
        const { frontmatter, content: body } =
          extractFrontMatter(originalContent);

        console.log("frontmatter", frontmatter, item.path);
        console.log("------------------");
        console.log("body", body);
        console.log("------------------");
        console.log("originalContent", originalContent);

        console.log("Processing file", item.path);
        const TARGET_DESCRIPTION_LENGTH = 150;
        let shouldGenerateDescription = false;

        if (
          frontmatter.description &&
          frontmatter.description.length < TARGET_DESCRIPTION_LENGTH
        ) {
          shouldGenerateDescription = true;
        }

        if (
          frontmatter.subtitle &&
          frontmatter.subtitle.length < TARGET_DESCRIPTION_LENGTH
        ) {
          shouldGenerateDescription = true;
        }

        if (
          !frontmatter ||
          (!frontmatter.description && !frontmatter.subtitle)
        ) {
          shouldGenerateDescription = true;
        }

        if (shouldGenerateDescription) {
          if (!auth.rigobot_token) {
            toast.error("No Rigobot token provided");
            return;
          }

          const rigoResponse = await generateAIDescription(auth.rigobot_token, {
            title: frontmatter.title || "PATH: " + item.path,
            content: originalContent,
          });
          frontmatter.description = rigoResponse.answer;
          const newContent = insertFrontMatter(body, frontmatter);

          return {
            path: item.path,
            frontmatter,
            body,
            newContent,
          };
        }
        return null;
      })
    );

    const filesToCommit = files.filter((file) => file !== null);

    if (filesToCommit.length === 0) {
      toast.error("No files to commit");
      return;
    }

    const commitMessage = `Added description to ${filesToCommit.length} files`;

    if (!auth.token) {
      toast.error("No token provided");
      return;
    }
    const toastId = toast.loading(`${filesToCommit.length} files to commit`);

    await commitMultipleFilesToGitHub({
      owner: repo.owner || "",
      repo: getRepoSectionFromUrl(repo.url).repo || "",
      branch: repo.branch || "",
      files: filesToCommit.map((file) => ({
        path: file?.path || "",
        content: file?.newContent || "",
      })),
      message: commitMessage,
      token: auth.token,
    });

    toast.success(commitMessage, { id: toastId });
  };

  const options: Record<string, () => void> = {
    generateDescription: handleGenerateDescription,
  };

  const handleRun = () => {
    options[selectedOption as keyof typeof options]();
  };

  return (
    <div className="flex-y gap-small justify-center">
      <h3>Bulk actions</h3>
      <div className="flex-x gap-small align-center">
        <p>{selectedItems.length} selected</p>
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
        >
          <option value="">Select an action</option>
          {Object.keys(options).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <button onClick={handleRun}>Run</button>
      </div>
    </div>
  );
};
