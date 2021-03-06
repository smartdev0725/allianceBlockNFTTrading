// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title Double linked-list
 */
library DoubleLinkedList {
    struct Node {
        uint256 next;
        uint256 previous;
    }

    struct LinkedList {
        uint256 head;
        uint256 tail;
        uint256 size;
        mapping(uint256 => Node) nodes;
    }

    /**
     * @notice Get Head ID
     * @param self the LinkedList
     * @return the first item of the list
     */
    function getHeadId(LinkedList storage self) internal view returns (uint256) {
        return self.head;
    }

    /**
     * @notice Get list size
     * @param self the LinkedList
     * @return the size of the list
     */
    function getSize(LinkedList storage self) internal view returns (uint256) {
        return self.size;
    }

    /**
     * @notice Adds a new node to the list
     * @param self the LinkedList
     * @param id the node to add
     */
    function addNode(LinkedList storage self, uint256 id) internal {
        require(id != 0, "Id should be different from zero");

        //If empty
        if (self.head == 0) {
            self.head = id;
            self.tail = id;
        }
        //Else push in tail
        else {
            uint256 tail = self.tail;
            self.nodes[tail].next = id;
            self.nodes[id] = Node(0, tail);
            self.tail = id;
        }

        self.size += 1;
    }

    /**
     * @notice Removes node from the list
     * @param self the LinkedList
     * @param id the id of the node to remove
     */
    function removeNode(LinkedList storage self, uint256 id) internal {
        require(self.size > 0, "Cannot remove an item from an empty list");
        require(id != 0, "Id should be different from zero");

        uint256 head = self.head;
        uint256 tail = self.tail;

        if (self.size == 1) {
            self.head = 0;
            self.tail = 0;
        } else if (id == head) {
            self.head = self.nodes[head].next;
            // head was updated previously, so we can't use the memory variable here
            self.nodes[self.head].previous = 0;
        } else if (id == tail) {
            self.tail = self.nodes[tail].previous;
            // tail was updated previously, so we can't use the memory variable here
            self.nodes[self.tail].next = 0;
        } else {
            self.nodes[self.nodes[id].next].previous = self.nodes[id].previous;
            self.nodes[self.nodes[id].previous].next = self.nodes[id].next;
        }

        delete self.nodes[id];
        self.size -= 1;
    }

    /**
     * @notice Pops the head of the list
     * @param self the LinkedList
     * @return head the first item of the list
     */
    function popHead(LinkedList storage self) internal returns (uint256 head) {
        require(self.size > 0, "Cannot pop an item from an empty list");

        head = self.head;

        if (self.size == 1) {
            self.head = 0;
            self.tail = 0;
        } else {
            self.head = self.nodes[self.head].next;
            self.nodes[self.head].previous = 0;
        }

        delete self.nodes[head];
        self.size -= 1;
    }

    /**
     * @notice Get id by index
     * @param self the LinkedList
     * @param index the id of the index
     * @return id the item in index position
     * @return found boolean whether or not the entry was found
     */
    function getIndexedId(LinkedList storage self, uint256 index) internal view returns (uint256 id, bool found) {
        id = self.head;

        for (uint256 i = 1; i < index && !found; i++) {
            id = self.nodes[id].next;
            found = id != 0;
        }
    }

    /**
     * @notice Clone LinkedList
     * @param self the LinkedList
     * @param listToClone the LinkedList storage to clone the list from
     */
    function cloneList(LinkedList storage self, LinkedList storage listToClone) internal {
        self.head = listToClone.head;
        self.tail = listToClone.tail;
        self.size = listToClone.size;

        uint256 id = listToClone.head;

        for (uint256 i = 0; i < listToClone.size; i++) {
            self.nodes[id] = listToClone.nodes[id];
            id = listToClone.nodes[id].next;
        }
    }
}
