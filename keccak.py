from Crypto.Hash import keccak

k = keccak.new(digest_bits=256)
k.update(b"Christopher")
print(k.hexdigest())
