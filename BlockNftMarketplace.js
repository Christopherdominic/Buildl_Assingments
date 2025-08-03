const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

//  Utility function to deploy contracts
const deployBlockMarketPlace = async () => {
  const [owner_, addr1, addr2, addr3] = await ethers.getSigners();
  const BlockMarketPlaceContract = await ethers.getContractFactory("BlockMarketPlace");
  const BlockNftContract = await ethers.getContractFactory("BlockNft");
  const BlockTokenContract = await ethers.getContractFactory("BlockToken");

  const BlockToken = await BlockTokenContract.deploy("BlockToken", "BCT", owner_.address);
  const blocknft = await BlockNftContract.deploy();
  const marketplace = await BlockMarketPlaceContract.connect(owner_).deploy();

  return { marketplace, blocknft, BlockToken, owner_, addr1, addr2, addr3 };
};

//  Main Test Suite
describe("BlockMarketPlace Test Suite", () => {
  //  Deployment Tests
  describe("Deployment", () => {
    it("Should return set values upon deployment", async () => {
      const { marketplace, owner_ } = await loadFixture(deployBlockMarketPlace);
      expect(await marketplace.marketOwner()).to.eq(owner_);
    });
  });

  // Listing Tests
  describe("Listing", () => {
    it("Should list Nft accordingly", async () => {
      const { marketplace, addr1, BlockToken, blocknft } = await loadFixture(deployBlockMarketPlace);

      const tokenId = 1;
      await blocknft.connect(addr1).mint(addr1);
      const token = await ethers.getContractAt("IERC20", BlockToken);

      await blocknft.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);

      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 100000,
        sold: false,
        minOffer: 10,
      });

      expect(await blocknft.ownerOf(tokenId)).to.eq(await marketplace.getAddress());
    });

    it("Should revert upon setting unaccepted values", async () => {
      const { marketplace, addr1, BlockToken, blocknft } = await loadFixture(deployBlockMarketPlace);

      const tokenId = 1;
      await blocknft.connect(addr1).mint(addr1);
      const token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);

      // Revert on price = 0
      await expect(
        marketplace.connect(addr1).listNft({
          owner: addr1,
          tokenId,
          paymentToken: token,
          NftToken: blocknft.getAddress(),
          isNative: false,
          price: 0,
          sold: false,
          minOffer: 10,
        })
      ).to.be.revertedWith("Invalid price");

      // Revert on minOffer = 0
      await expect(
        marketplace.connect(addr1).listNft({
          owner: addr1,
          tokenId,
          paymentToken: token,
          NftToken: blocknft.getAddress(),
          isNative: false,
          price: 10000,
          sold: false,
          minOffer: 0,
        })
      ).to.be.revertedWith("Invalid min offer");

      // Revert on using native ETH with non-zero token address
      await expect(
        marketplace.connect(addr1).listNft({
          owner: addr1,
          tokenId,
          paymentToken: token,
          NftToken: blocknft.getAddress(),
          isNative: true,
          price: 10000,
          sold: false,
          minOffer: 10,
        })
      ).to.be.revertedWith("ERC20 Payment is not supported");

      // Accept native ETH with Zero Address
      const ZeroAddress = ethers.constants.AddressZero;

      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 10000,
        sold: false,
        minOffer: 10,
      });

      const [, , paymentToken] = await marketplace.getListing(1);
      expect(paymentToken).to.eq(ZeroAddress);
    });
  });

  // Purchase Tests
  describe("Purchase", () => {
    it("Should revert if the NFT is already sold", async () => {
      const { marketplace, blocknft, BlockToken, owner_, addr1, addr2, addr3 } = await loadFixture(deployBlockMarketPlace);

      const tokenId = 1;
      await blocknft.connect(addr1).mint(addr1);
      const token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);

      const listId = 0;
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 500,
        sold: false,
        minOffer: 250,
      });

      await BlockToken.connect(owner_).mint(2000, owner_);
      await BlockToken.connect(owner_).transfer(addr2.address, 1000);
      await BlockToken.connect(addr2).approve(marketplace.getAddress(), 1000);
      await marketplace.connect(addr2).buyNft(listId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2.address);
      expect((await marketplace.getListing(listId)).sold).to.equal(true);

      await BlockToken.connect(owner_).transfer(addr3.address, 500);
      await BlockToken.connect(addr3).approve(marketplace.getAddress(), 500);

      await expect(
        marketplace.connect(addr3).buyNft(listId)
      ).to.be.revertedWith("ALready Sold");
    });

    it("Should buy successfully with native ETH", async () => {
      const { marketplace, addr1, blocknft, addr2 } = await loadFixture(deployBlockMarketPlace);

      const tokenId = 1;
      const ZeroAddress = ethers.constants.AddressZero;

      await blocknft.connect(addr1).mint(addr1);
      await blocknft.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);

      const listId = 0;
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 10,
        sold: false,
        minOffer: 5,
      });

      await marketplace.connect(addr2).buyNft(listId, { value: 10 });

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2.address);
      expect((await marketplace.getListing(listId)).sold).to.equal(true);
    });

    it("Should revert if price is incorrect", async () => {
      const { marketplace, addr1, blocknft, addr2 } = await loadFixture(deployBlockMarketPlace);

      const tokenId = 1;
      const ZeroAddress = ethers.constants.AddressZero;

      await blocknft.connect(addr1).mint(addr1);
      await blocknft.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);

      const listId = 0;
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 10,
        sold: false,
        minOffer: 5,
      });

      await expect(
        marketplace.connect(addr2).buyNft(listId, { value: 3 })
      ).to.be.revertedWith("Incorrect price");
    });
  });
});
