import ecdsa
import sha3

# 1. Create a Private Key
private_key = ecdsa.SigningKey.generate(curve=ecdsa.SECP256k1)
print("Private Key:", private_key.to_string().hex())

# 2. Derive the Public Key
public_key = private_key.get_verifying_key()
print("Public Key:", public_key.to_string().hex())

# 3. Generate an Ethereum-like Address
keccak = sha3.keccak_256()
keccak.update(public_key.to_string())
address = keccak.hexdigest()[-40:]
print("Generated Address: 0x" + address)

# 4. Create a Message
first_name = "Christopher"
last_name = "Eze"
message = f"My name is {first_name} {last_name}"
print("Original Message:", message)

# 5. Hash the Message
keccak_msg = sha3.keccak_256()
keccak_msg.update(message.encode())
message_hash = keccak_msg.digest()
print("Hashed Message:", message_hash.hex())

# 6. Sign the Hash
signature = private_key.sign_digest(message_hash)
print("Digital Signature:", signature.hex())

# 7. Verify the Signature
is_valid = public_key.verify_digest(signature, message_hash)
print("Signature Valid?:", is_valid)
