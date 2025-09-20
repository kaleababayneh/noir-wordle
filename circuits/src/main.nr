use poseidon::poseidon2::Poseidon2;

fn main(
    // commitment hashes for each letter
    first_letter_commitment_hash: pub Field,
    second_letter_commitment_hash: pub Field,
    third_letter_commitment_hash: pub Field,
    fourth_letter_commitment_hash: pub Field,
    fifth_letter_commitment_hash: pub Field,
    // guess result
    first_letter_guess: pub Field,
    second_letter_guess: pub Field,
    third_letter_guess: pub Field,
    fourth_letter_guess: pub Field,
    fifth_letter_guess: pub Field,
    // calculated final result
    calculated_result: pub [u8; 5],
    // private inputs
    first_letter: Field,
    second_letter: Field,
    third_letter: Field,
    fourth_letter: Field,
    fifth_letter: Field,
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

    let mut correct_letters = [first_letter, second_letter, third_letter, fourth_letter, fifth_letter];
    let guess_letters = [first_letter_guess, second_letter_guess, third_letter_guess, fourth_letter_guess, fifth_letter_guess];
    let mut result_array = [0; 5];

    for i in 0..5 {
        if guess_letters[i] == correct_letters[i] {
            result_array[i] = 2; // Correct letter
        } else {
            let mut found = false;
            for j in 0..5 {
                if correct_letters[j] == guess_letters[i] {
                    found = true;
                }
            }
            if found {
                result_array[i] = 1; // Wrong position
            } else {
                result_array[i] = 0; // Incorrect letter
            }
        }
    }

    assert(calculated_result == result_array);
}




#[test]
fn test_main() {
    println("test");
    let salt = Field::from(0);
    let first_letter_commitment_hash: Field = 0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920;
    let first_letter: Field = Field::from(97);
    let second_letter_commitment_hash: Field = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
    let second_letter: Field = Field::from(112);
    let third_letter_commitment_hash: Field = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
    let third_letter: Field = Field::from(112);
    let fourth_letter_commitment_hash: Field = 0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad;
    let fourth_letter: Field = Field::from(108);
    let fifth_letter_commitment_hash: Field = 0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00;
    let fifth_letter: Field = Field::from(101);

    let first_letter_guess: Field = Field::from(97); // a
    let second_letter_guess: Field = Field::from(112); // p
    let third_letter_guess: Field = Field::from(112); // p
    let fourth_letter_guess: Field = Field::from(97); // a
    let fifth_letter_guess: Field = Field::from(111); // o

    let result: [u8; 5] = [2, 2, 2, 1, 0]; 
   


   main(
        first_letter_commitment_hash, 
        second_letter_commitment_hash, 
        third_letter_commitment_hash,
        fourth_letter_commitment_hash,
        fifth_letter_commitment_hash,
        
        first_letter_guess, 
        second_letter_guess, 
        third_letter_guess, 
        fourth_letter_guess, 
        fifth_letter_guess, 

        result, 

        first_letter, 
        second_letter, 
        third_letter, 
        fourth_letter, 
        fifth_letter, 

        salt
    );
}