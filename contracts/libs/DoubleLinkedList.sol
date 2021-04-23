pragma solidity ^0.7.0;

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

    function getHeadId(LinkedList storage self) internal view returns (uint256) {
        return self.head;
    }

    function getSize(LinkedList storage self) internal view returns (uint256) {
        return self.size;
    }

    function addNode(
        LinkedList storage self,
        uint256 id
    ) internal {
        //If empty
        if (self.head == 0) {
            self.head = id;
            self.tail = id;
            self.nodes[id] = Node(0, 0);
        }
        //Else push in tail
        else {
            self.nodes[self.tail].next = id;
            self.nodes[id] = Node(0, self.tail);
            self.tail = id;
        }

        self.size += 1;
    }

    function removeNode(LinkedList storage self, uint256 id) internal {
        if(self.size == 1) {
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

    function popHead(LinkedList storage self) internal returns(uint256 head) {
        head = self.head;

        if(self.size == 1) {
            self.head = 0;
            self.tail = 0;
        }
        else {
            self.head = self.nodes[self.head].next;
            self.nodes[self.head].previous = 0;
        }      

        self.size -= 1;
    }

    function getIndexedId(LinkedList storage self, uint256 index) internal returns(uint256 id) {
        id = self.head;

        for (uint256 i = 1; i < index; i++) {
            id = self.nodes[id].next;
        }
    }

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
