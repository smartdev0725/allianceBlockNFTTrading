pragma solidity 0.7.0;

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

    function getHeadId(LinkedList storage self) internal view returns (uint256) {
        return self.head;
    }

    function getSize(LinkedList storage self) internal view returns (uint256) {
        return self.size;
    }

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
        }
        else {
            //If middle
            if (self.size > 1) {
                for (uint256 i = 1; i < self.size; i++) {
                    node = self.nodes[node.next];
                    if (value > node.value) {
                        uint256 currentId = self.nodes[node.next].previous;
                        self.nodes[node.next].previous = id;
                        self.nodes[id] = Node(
                            currentId,
                            self.nodes[currentId].next,
                            value
                        );
                        self.nodes[currentId].next = id;
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

    function removeNode(LinkedList storage self, uint256 id) internal {
        if (self.size == 1) {
            self.head = 0;
            self.tail = 0;
        }
        else if (id == self.head) {
            self.head = self.nodes[self.head].next;
            self.nodes[self.head].previous = 0;
        }
        else if (id == self.tail) {
            self.tail = self.nodes[self.tail].previous;
            self.nodes[self.tail].next = 0;
        }
        else {
            self.nodes[self.nodes[id].next].previous = self.nodes[id].previous;
            self.nodes[self.nodes[id].previous].next = self.nodes[id].next;
        }       

        self.size -= 1;
    }

    function getPositionForId(LinkedList storage self, uint256 id) internal view returns(uint256) {
        uint256 positionCounter;
        uint256 id;

        while(true) {
            positionCounter += 1;
            if (id == self.head) break;

            id = self.nodes[id].previous;
        }
    }
}
