/**
 * Chat Branching System
 * Manages conversation tree with branches, editing, and regeneration
 */

class ChatBranch {
    constructor() {
        this.tree = {
            id: 'root',
            children: [],
            message: null,
            parent: null
        };
        this.currentNode = this.tree;
        this.currentBranchPath = ['root'];
        this.activeBranches = new Map(); // Track all branch endpoints
    }

    /**
     * Add a message to the current branch
     */
    addMessage(message) {
        const newNode = {
            id: this.generateId(),
            message: message,
            children: [],
            parent: this.currentNode,
            timestamp: Date.now()
        };

        this.currentNode.children.push(newNode);
        this.currentNode = newNode;
        this.currentBranchPath.push(newNode.id);

        // Update active branches
        this.updateActiveBranches();

        return newNode;
    }

    /**
     * Create a new branch from a specific node
     */
    createBranch(nodeId, message) {
        const node = this.findNode(nodeId);
        if (!node) return null;

        const newNode = {
            id: this.generateId(),
            message: message,
            children: [],
            parent: node,
            timestamp: Date.now(),
            isBranch: true
        };

        node.children.push(newNode);
        this.currentNode = newNode;

        // Rebuild branch path
        this.currentBranchPath = this.getPathToNode(newNode);

        // Update active branches
        this.updateActiveBranches();

        return newNode;
    }

    /**
     * Edit a message (creates a new branch)
     */
    editMessage(nodeId, newContent) {
        const node = this.findNode(nodeId);
        if (!node || !node.parent) return null;

        // Create new branch from parent
        const editedMessage = {
            ...node.message,
            content: newContent,
            edited: true,
            originalNodeId: nodeId
        };

        return this.createBranch(node.parent.id, editedMessage);
    }

    /**
     * Regenerate response (creates new branch with same prompt)
     */
    regenerateResponse(nodeId) {
        const node = this.findNode(nodeId);
        if (!node || !node.parent) return null;

        // Get the user message that prompted this response
        const userNode = node.parent;
        if (!userNode || !userNode.message) return null;

        // Create new branch from user message with regenerated flag
        const regeneratedMessage = {
            ...node.message,
            regenerated: true,
            regenerationOf: nodeId
        };

        return this.createBranch(userNode.id, regeneratedMessage);
    }

    /**
     * Switch to a different branch
     */
    switchToBranch(branchEndNodeId) {
        const node = this.findNode(branchEndNodeId);
        if (!node) return null;

        this.currentNode = node;
        this.currentBranchPath = this.getPathToNode(node);

        return this.getMessagesInBranch();
    }

    /**
     * Delete a branch
     */
    deleteBranch(nodeId) {
        const node = this.findNode(nodeId);
        if (!node || !node.parent) return false;

        const parent = node.parent;
        const index = parent.children.indexOf(node);
        if (index > -1) {
            parent.children.splice(index, 1);
        }

        // If we deleted the current branch, switch to parent's first child or parent
        if (this.currentBranchPath.includes(nodeId)) {
            if (parent.children.length > 0) {
                this.switchToBranch(parent.children[0].id);
            } else {
                this.currentNode = parent;
                this.currentBranchPath = this.getPathToNode(parent);
            }
        }

        this.updateActiveBranches();
        return true;
    }

    /**
     * Get all messages in current branch
     */
    getMessagesInBranch() {
        const messages = [];
        let node = this.currentNode;

        // Traverse up to root, collecting messages
        while (node && node.message) {
            messages.unshift(node.message);
            node = node.parent;
        }

        return messages;
    }

    /**
     * Get all active branches (leaf nodes)
     */
    getActiveBranches() {
        return Array.from(this.activeBranches.values());
    }

    /**
     * Find node by ID
     */
    findNode(nodeId, startNode = this.tree) {
        if (startNode.id === nodeId) return startNode;

        for (const child of startNode.children) {
            const found = this.findNode(nodeId, child);
            if (found) return found;
        }

        return null;
    }

    /**
     * Get path from root to node
     */
    getPathToNode(node) {
        const path = [];
        let current = node;

        while (current) {
            path.unshift(current.id);
            current = current.parent;
        }

        return path;
    }

    /**
     * Update active branches map
     */
    updateActiveBranches() {
        this.activeBranches.clear();
        this.findLeafNodes(this.tree);
    }

    /**
     * Find all leaf nodes (branch endpoints)
     */
    findLeafNodes(node, depth = 0) {
        if (node.children.length === 0 && node.message) {
            // This is a leaf node
            const messages = this.getMessagesForNode(node);
            const preview = this.generateBranchPreview(messages);

            this.activeBranches.set(node.id, {
                id: node.id,
                messages: messages,
                preview: preview,
                timestamp: node.timestamp,
                depth: depth,
                isCurrent: node.id === this.currentNode.id
            });
        }

        for (const child of node.children) {
            this.findLeafNodes(child, depth + 1);
        }
    }

    /**
     * Get all messages for a specific node
     */
    getMessagesForNode(node) {
        const messages = [];
        let current = node;

        while (current && current.message) {
            messages.unshift(current.message);
            current = current.parent;
        }

        return messages;
    }

    /**
     * Generate preview text for branch
     */
    generateBranchPreview(messages) {
        if (messages.length === 0) return 'Empty branch';

        const lastMessage = messages[messages.length - 1];
        const preview = lastMessage.content.substring(0, 50);

        return `${messages.length} messages: ${preview}...`;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export tree to JSON
     */
    exportTree() {
        // Remove parent references to avoid circular JSON
        const cleanTree = this.cleanTreeForExport(this.tree);
        return {
            tree: cleanTree,
            currentPath: this.currentBranchPath
        };
    }

    /**
     * Remove parent references from tree for JSON serialization
     */
    cleanTreeForExport(node) {
        const cleaned = {
            id: node.id,
            message: node.message,
            timestamp: node.timestamp,
            isBranch: node.isBranch,
            children: node.children.map(child => this.cleanTreeForExport(child))
        };
        return cleaned;
    }

    /**
     * Import tree from JSON
     */
    importTree(data) {
        if (!data || !data.tree) return false;

        this.tree = data.tree;
        this.currentBranchPath = data.currentPath || ['root'];

        // Reconstruct parent references
        this.reconstructParents(this.tree);

        // Find current node
        const lastId = this.currentBranchPath[this.currentBranchPath.length - 1];
        this.currentNode = this.findNode(lastId) || this.tree;

        this.updateActiveBranches();
        return true;
    }

    /**
     * Reconstruct parent references after import
     */
    reconstructParents(node, parent = null) {
        node.parent = parent;
        for (const child of node.children) {
            this.reconstructParents(child, node);
        }
    }
}

// Export for use in main chat
window.ChatBranch = ChatBranch;
