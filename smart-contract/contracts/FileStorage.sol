// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileStorage {

    mapping(string => bool) private storedHashes;

    event FileStored(string hash);

    function storeFileHash(string memory hash) public {
        storedHashes[hash] = true;
        emit FileStored(hash);
    }

    function verifyFileHash(string memory hash) public view returns (bool) {
        return storedHashes[hash];
    }
}