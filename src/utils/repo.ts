import axios from "axios";
import { Octokit } from "octokit";
import { TFileSystemItem } from "../components/FileSystem/FileSystem";
import yaml from "js-yaml";

export const extendItems = (items: TFileSystemItem[]) => {
  return items.map((item) => ({
    ...item,
    selected: false,
  }));
};

export const buildRepoMap = async ({
  githubUrl,
  token,
}: {
  githubUrl: string;
  token: string;
}) => {
  const repoMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

  if (!repoMatch) {
    throw new Error("Invalid GitHub URL");
  }

  const [_, owner, repo] = repoMatch;

  const octokit = new Octokit({
    auth: token,
  });

  const fetchFiles = async (path: string = ""): Promise<any[]> => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      const files: any[] = [];

      for (const file of Array.isArray(data) ? data : [data]) {
        if (file.type === "dir") {
          // Recursively fetch directory contents
          const subFiles = await fetchFiles(file.path);
          files.push(...subFiles);
        } else {
          files.push(file); // Add file to the list
        }
      }

      return files;
    } catch (error) {
      console.error(
        "Error fetching repository contents:",
        // @ts-ignore
        error.response?.data || error.message
      );
      throw error;
    }
  };

  const files = await fetchFiles();
  return extendItems(files);
};

/**
 * Fetches the text content of a file from a GitHub raw URL.
 *
 * @param githubRawUrl - The GitHub raw URL of the file.
 * @returns The text content of the file.
 * @throws Error if the request fails or the URL is invalid.
 */
export const fetchFileContent = async (
  githubRawUrl: string
): Promise<string> => {
  // Validate the URL format
  if (!githubRawUrl.startsWith("https://raw.githubusercontent.com/")) {
    throw new Error("Invalid GitHub raw URL");
  }

  try {
    // Fetch the file content
    const response = await axios.get(githubRawUrl, {
      responseType: "text", // Ensure the response is treated as plain text
    });

    return response.data; // Return the text content
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching file content:", error.message);
    } else {
      console.error("Unknown error occurred while fetching file content");
    }
    throw error;
  }
};

import frontMatter from "front-matter";
/**
 * Parses a Markdown file with frontmatter using gray-matter.
 *
 * @param fileContent - The raw content of the Markdown file.
 * @returns An object containing the frontmatter data and the Markdown content.
 */
export const extractFrontMatter = (
  fileContent: string
): {
  frontmatter: any;
  content: string;
} => {
  try {
    const { attributes, body } = frontMatter(fileContent);

    return {
      frontmatter: attributes, // The frontmatter metadata as an object
      content: body, // The Markdown content as a string
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error parsing Markdown file:", error.message);
    } else {
      console.error("Unknown error occurred while parsing Markdown file");
    }
    throw error;
  }
};

const removeFrontMatter = (fileContent: string) => {
  // Check if the file content starts with ---
  if (!fileContent.startsWith("---")) {
    return fileContent;
  }
  let newFileContent = fileContent.replace(/^---\n(.*)\n---\n/, "");
  return newFileContent;
};

export const insertFrontMatter = (fileContent: string, frontmatter: any) => {
  const newFrontMatter = `---\n${yaml.dump(frontmatter)}---\n`;
  const contentAfterInsert = `${newFrontMatter}${removeFrontMatter(
    fileContent
  )}`;

  return contentAfterInsert;
};

/**
 * Commits multiple file changes to a GitHub repository.
 *
 * @param owner - The owner of the repository (username or organization).
 * @param repo - The name of the repository.
 * @param branch - The branch where the commit will be made.
 * @param files - An array of files to update or create.
 * @param message - The commit message.
 * @param token - Your GitHub personal access token.
 */

export const commitMultipleFilesToGitHub = async ({
  owner,
  repo,
  branch,
  files,
  message,
  token,
}: {
  owner: string;
  repo: string;
  branch: string;
  files: { path: string; content: string }[]; // File paths and their content
  message: string;
  token: string;
}) => {
  const octokit = new Octokit({
    auth: token,
  });
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    // console.log("Reference data:", refData);

    const commitSha = refData.object.sha;

    // Step 2: Get the commit object
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    // console.log("Commit data:", commitData);

    const treeSha = commitData.tree.sha;

    // Step 3: Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: file.content, // Encode content in Base64 using btoa
          encoding: "utf-8",
        });

        return { path: file.path, ...blobData };
      })
    );

    // Step 4: Create a new tree with the blobs
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      })),
    });

    // Step 5: Create a new commit
    const { data: newCommitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [commitSha],
    });

    // Step 6: Update the reference to point to the new commit
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitData.sha,
    });

    console.log("Commit with multiple files successfully created!");
  } catch (error) {
    console.error(
      "Error creating commit:",
      // @ts-ignore
      error.response?.data || error.message
    );
  }
};

export const getUserProfile = async (token: string) => {
  const octokit = new Octokit({
    auth: token,
  });
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    return data;
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
  }
};

const extractPropertiesFromUrl = (url: string) => {
  const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!repoMatch) {
    throw new Error("Invalid GitHub URL");
  }
  const [_, owner, repo] = repoMatch;
  return { owner, repo };
};

/**
 * Fetches all branches of a GitHub repository.
 *
 * @param owner - The owner of the repository (username or organization).
 * @param repo - The name of the repository.
 * @param token - Your GitHub personal access token.
 * @returns An array of branch names.
 * @throws Error if the request fails.
 */
export const getBranches = async ({
  repoUrl,
  token,
}: {
  repoUrl: string;
  token: string;
}): Promise<
  {
    name: string;
    commit: { sha: string; url: string };
    selected: boolean;
  }[]
> => {
  const octokit = new Octokit({
    auth: token,
  });

  const { owner, repo } = extractPropertiesFromUrl(repoUrl);

  try {
    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
    });

    return data.map((branch) => ({
      name: branch.name,
      commit: branch.commit,
      selected: false,
    }));
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw error;
  }
};

export const getOwnerFromUrl = (url: string) => {
  const urlObj = new URL(url);
  const owner = urlObj.pathname.split("/")[1];
  return owner;
};
