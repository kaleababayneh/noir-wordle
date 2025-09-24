use poseidon::poseidon2::Poseidon2;

fn main(
    // commitment hashes for each letter
    first_letter_commitment_hash: pub Field,
    second_letter_commitment_hash: pub Field,
    third_letter_commitment_hash: pub Field,
    fourth_letter_commitment_hash: pub Field,
    fifth_letter_commitment_hash: pub Field,
    // merkle root
    merkle_root: pub Field,
    // private inputs merkle proof
    merkle_path: [Field; 14],
    merkle_indices: [u8; 14],
    // private inputs letters
    first_letter: Field,
    second_letter: Field,
    third_letter: Field,
    fourth_letter: Field,
    fifth_letter: Field,
    // private input salt
    salt: Field,
    )
     {

    let first_letter_commitment = Poseidon2::hash([ salt, first_letter], 2);
    assert(first_letter_commitment == first_letter_commitment_hash);
    let second_letter_commitment = Poseidon2::hash([salt, second_letter], 2);
    assert(second_letter_commitment == second_letter_commitment_hash);
    let third_letter_commitment = Poseidon2::hash([salt, third_letter], 2);
    assert(third_letter_commitment == third_letter_commitment_hash);
    let fourth_letter_commitment = Poseidon2::hash([salt, fourth_letter], 2);
    assert(fourth_letter_commitment == fourth_letter_commitment_hash);
    let fifth_letter_commitment = Poseidon2::hash([salt, fifth_letter], 2);
    assert(fifth_letter_commitment == fifth_letter_commitment_hash);

    let mut currentLevelHash = [first_letter, second_letter, third_letter, fourth_letter, fifth_letter];
    // if merkle index is 1 use current level hash as left node else use as right node
    // hash left and right to get new current level hash
    for i in 0..20 {
        let (left, right) = if merkle_indices[i] {
            (currentLevelHash, merkle_path[i])
        } else {
            (merkle_path[i], currentLevelHash)
        };
        currentLevelHash = Poseidon2::hash([left, right], 2);
    }

    assert(currentLevelHash == merkle_root);    
}




#[test]
fn test_main() {
//     println("test");
//     let salt = Field::from(0);
//     let first_letter_commitment_hash: Field = 0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920;
//     let first_letter: Field = Field::from(97);
//     let second_letter_commitment_hash: Field = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
//     let second_letter: Field = Field::from(112);
//     let third_letter_commitment_hash: Field = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
//     let third_letter: Field = Field::from(112);
//     let fourth_letter_commitment_hash: Field = 0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad;
//     let fourth_letter: Field = Field::from(108);
//     let fifth_letter_commitment_hash: Field = 0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00;
//     let fifth_letter: Field = Field::from(101);

//     let first_letter_guess: Field = Field::from(97); // a
//     let second_letter_guess: Field = Field::from(112); // p
//     let third_letter_guess: Field = Field::from(112); // p
//     let fourth_letter_guess: Field = Field::from(97); // a
//     let fifth_letter_guess: Field = Field::from(111); // o

//     let result: [u8; 5] = [2, 2, 2, 1, 0]; 
   


//    main(
//         first_letter_commitment_hash, 
//         second_letter_commitment_hash, 
//         third_letter_commitment_hash,
//         fourth_letter_commitment_hash,
//         fifth_letter_commitment_hash,
        
//         first_letter_guess, 
//         second_letter_guess, 
//         third_letter_guess, 
//         fourth_letter_guess, 
//         fifth_letter_guess, 

//         result, 

//         first_letter, 
//         second_letter, 
//         third_letter, 
//         fourth_letter, 
//         fifth_letter, 

//         salt
//     );
}