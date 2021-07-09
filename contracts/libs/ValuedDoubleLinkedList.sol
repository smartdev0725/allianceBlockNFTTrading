// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

/**
 * @title the Valued Double Linked List library
 */
library ValuedDoubleLinkedList {
    struct Node {
        uint256 next;
        uint256 previous;
        uint256 value;
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
     * @notice Get head value
     * @param self the LinkedList
     * @return the value of the first node
     */
    function getHeadValue(LinkedList storage self) internal view returns (uint256) {
        return self.nodes[self.head].value;
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
     * @notice Adds node increment
     * @param self the LinkedList
     * @param value the value to add
     * @param id the id of the node
     */
    function addNodeIncrement(
        LinkedList storage self,
        uint256 value,
        uint256 id
    ) internal {
        Node memory node = self.nodes[self.head];

        //If empty
        if (self.head == 0) {
            self.head = id;
            self.tail = id;
            self.nodes[id] = Node(0, 0, value);
        }
        //If head
        else if (value < node.value) {
            self.nodes[self.head].previous = id;
            self.nodes[id] = Node(self.head, 0, value);
            self.head = id;
        } else {
            //If middle
            if (self.size > 1) {
                for (uint256 i = 1; i < self.size; i++) {
                    node = self.nodes[node.next];
                    if (value < node.value) {
                        uint256 nextId = self.nodes[node.next].previous;
                        uint256 previousId = self.nodes[nextId].previous;
                        self.nodes[id] = Node(nextId, previousId, value);
                        self.nodes[previousId].next = id;
                        self.nodes[nextId].previous = id;
                        break;
                    }
                }
            }
            //If tail
            if (self.nodes[id].value != value) {
                self.nodes[id] = Node(0, self.tail, value);
                self.nodes[self.tail].next = id;
                self.tail = id;
            }
        }

        self.size += 1;
    }

    /**
     * @notice Adds node decrement
     * @param self the LinkedList
     * @param value the value to decrement
     * @param id the id of the node
     */
    function addNodeDecrement(
        LinkedList storage self,
        uint256 value,
        uint256 id
    ) internal {
        Node memory node = self.nodes[self.head];

        //If empty
        if (self.head == 0) {
            self.head = id;
            self.tail = id;
            self.nodes[id] = Node(0, 0, value);
        }
        //If head
        else if (value > node.value) {
            self.nodes[self.head].previous = id;
            self.nodes[id] = Node(self.head, 0, value);
            self.head = id;
        } else {
            //If middle
            if (self.size > 1) {
                for (uint256 i = 1; i < self.size; i++) {
                    node = self.nodes[node.next];
                    if (value > node.value) {
                        uint256 nextId = self.nodes[node.next].previous;
                        uint256 previousId = self.nodes[nextId].previous;
                        self.nodes[id] = Node(nextId, previousId, value);
                        self.nodes[previousId].next = id;
                        self.nodes[nextId].previous = id;
                        break;
                    }
                }
            }
            //If tail
            if (self.nodes[id].value != value) {
                self.nodes[id] = Node(0, self.tail, value);
                self.nodes[self.tail].next = id;
                self.tail = id;
            }
        }

        self.size += 1;
    }

    /**
     * @notice Removes a node
     * @param self the LinkedList
     * @param id the id of the node to remove
     */
    function removeNode(LinkedList storage self, uint256 id) internal {
        if (self.size == 1) {
            self.head = 0;
            self.tail = 0;
        } else if (id == self.head) {
            self.head = self.nodes[self.head].next;
            self.nodes[self.head].previous = 0;
        } else if (id == self.tail) {
            self.tail = self.nodes[self.tail].previous;
            self.nodes[self.tail].next = 0;
        } else {
            self.nodes[self.nodes[id].next].previous = self.nodes[id].previous;
            self.nodes[self.nodes[id].previous].next = self.nodes[id].next;
        }

        self.size -= 1;
    }

    /**
     * @notice Pops the head of the list
     * @param self the LinkedList
     * @return head the first item of the list
     */
    function popHead(LinkedList storage self) internal returns (uint256 head) {
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
     * @notice Pops the head and value of the list
     * @param self the LinkedList
     * @return head
     * @return value
     */
    function popHeadAndValue(LinkedList storage self) internal returns (uint256 head, uint256 value) {
        head = self.head;
        value = self.nodes[self.head].value;

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
     * @notice Removes multiple nodes
     * @param self the LinkedList
     * @param amountOfNodes the number of nodes to remove starting from Head
     */
    function removeMultipleFromHead(LinkedList storage self, uint256 amountOfNodes) internal {
        require(self.size >= amountOfNodes, "Size not enough");

        for (uint256 i = 0; i < amountOfNodes; i++) {
            uint256 nodeToRemove = self.head;
            if (self.size == 1) {
                self.head = 0;
                self.tail = 0;
            } else {
                self.head = self.nodes[self.head].next;
                self.nodes[self.head].previous = 0;
            }

            delete self.nodes[nodeToRemove];
            self.size -= 1;
        }
    }

    /**
     * @notice Get position from ID
     * @param self the LinkedList
     * @param id the id to search
     * @return the index position for the id provided
     */
    function getPositionForId(LinkedList storage self, uint256 id) internal view returns (uint256) {
        uint256 positionCounter;

        if (self.nodes[id].value == 0) return 0; // If not in list.

        while (true) {
            positionCounter += 1;
            if (id == self.head) break;

            id = self.nodes[id].previous;
        }

        return positionCounter;
    }

    /**
     * @notice Clones ValuedDoubleLinkedList
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
