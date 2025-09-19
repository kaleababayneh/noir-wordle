// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import { Poseidon2, Field } from "@poseidon/src/Poseidon2.sol";


contract MixerTest is Test {
   Mixer public  mixer;
    Poseidon2 public hasher;
    HonkVerifier public honkverifier;

    //address public recipient = makeAddr("recipient");

    function setUp() public {
        honkverifier = new HonkVerifier();
        hasher = new Poseidon2();
        mixer = new Mixer(honkverifier, hasher, 20);
    }


}