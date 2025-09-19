use poseidon::poseidon2::Poseidon2;

fn main(
    // public inputs

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
        // final result
    result: pub Field,

    // private inputs
    first_letter: pub Field,
    second_letter: pub Field,
    third_letter: pub Field,
    fourth_letter: pub Field,
    fifth_letter: pub Field,
    salt: Field,
    )
     {

    let first_letter_commitment = Poseidon2::hash([first_letter, salt], 2);
    assert(first_letter_commitment == first_letter_commitment_hash);
    let second_letter_commitment = Poseidon2::hash([second_letter, salt], 2);
    assert(second_letter_commitment == second_letter_commitment_hash);
    let third_letter_commitment = Poseidon2::hash([third_letter, salt], 2);
    assert(third_letter_commitment == third_letter_commitment_hash);
    let fourth_letter_commitment = Poseidon2::hash([fourth_letter, salt], 2);
    assert(fourth_letter_commitment == fourth_letter_commitment_hash);
    let fifth_letter_commitment = Poseidon2::hash([fifth_letter, salt], 2);
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

    assert(result == result);
}


// fn check_letter(
//     // public inputs
//     letter: pub Field,
//     commitment_hash: pub Field,
//     // private inputs
//     salt: Field,
//     )
//      {
//     let commitment = Poseidon2::hash([letter, salt], 2);
//     assert(commitment == commitment_hash);
// }


/*
 '0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920',
  '0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70',
  '0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70',
  '0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad',
  '0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00'

*/
#[test]
// fn test_main() {
//     println("input");
//     let salt = Field::from(0);
//     let first_letter_commitment_hash = "0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920";

//     let calculated_hash = Poseidon2::hash([salt, Field::from(first_letter_commitment_hash)], 2);
//     //let first_letter = Field::from(1);
//     println(salt);
//     println(first_letter_commitment_hash);
//     println(calculated_hash);
// }

fn test_main() {
    println("input");
    let salt = Field::from(0);
    let first_letter_commitment_hash: Field = 0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920;
    let first_letter: Field = Field::from(97);
    

    let calculated_hash = Poseidon2::hash([salt, first_letter], 2);
    println(salt);
    println(first_letter_commitment_hash);
    println(calculated_hash);
}