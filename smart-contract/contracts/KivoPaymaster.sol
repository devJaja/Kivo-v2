// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title KivoPaymaster
 * @dev This contract is a paymaster for the Kivo Wallet. It allows sponsoring transactions for specific accounts.
 * The paymaster verifies the user operation and pays for the transaction if the account is sponsored.
 * It uses a signature from the owner to authorize the payment.
 */
abstract contract KivoPaymaster is IPaymaster, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @dev The entry point contract for the account abstraction.
    IEntryPoint public immutable entryPoint;

    /// @dev A mapping to store which accounts are sponsored.
    mapping(address => bool) public sponsoredAccounts;

    /**
     * @dev Constructor for the KivoPaymaster.
     * @param _entryPoint The address of the entry point contract.
     */
    constructor(IEntryPoint _entryPoint) Ownable(msg.sender) {
        entryPoint = _entryPoint;
    }

    /**
     * @dev Sets the sponsorship status for an account.
     * @param account The address of the account to set the sponsorship for.
     * @param enabled A boolean indicating whether the sponsorship is enabled or disabled.
     */
    function setSponsorship(address account, bool enabled) public onlyOwner {
        sponsoredAccounts[account] = enabled;
    }

    /**
     * @dev Validates the paymaster user operation.
     * @param userOp The packed user operation.
     * @param userOpHash The hash of the user operation.
     * @param requiredPreFund The required pre-fund for the transaction.
     * @return context The context for the post-operation hook.
     * @return validationData The validation data for the entry point.
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    )
        external
        virtual
        override
        returns (bytes memory context, uint256 validationData)
    {
        // Check if the account is sponsored.
        if (!sponsoredAccounts[userOp.sender]) {
            revert("Account not sponsored");
        }

        // Decode the paymasterAndData field to get the validity timestamps and the signature.
        (uint256 validUntil, uint256 validAfter, bytes memory signature) = abi.decode(userOp.paymasterAndData, (uint256, uint256, bytes));
        
        // Hash the user operation hash, validUntil, and validAfter to get the hash to be signed.
        bytes32 hash = keccak256(abi.encodePacked(userOpHash, validUntil, validAfter));
        
        // Recover the signer from the signature.
        address signer = hash.recover(signature);

        // Check if the signer is the owner of the paymaster.
        if (signer != owner()) {
            revert("Invalid paymaster signature");
        }

        // Set the context to empty bytes as we don't have a post-operation hook.
        context = "";
        
        // Pack the validity timestamps into the validationData.
        validationData = pack(validUntil, validAfter);
    }

    /**
     * @dev Gets the validity timestamps for the paymaster signature.
     * @return validUntil The timestamp until which the signature is valid.
     * @return validAfter The timestamp after which the signature is valid.
     */
    function _getValidityTimestamp() internal view returns (uint256 validUntil, uint256 validAfter) {
        return (block.timestamp + 30 days, block.timestamp);
    }

    /**
     * @dev Packs the validity timestamps into a single uint256.
     * @param validUntil The timestamp until which the signature is valid.
     * @param validAfter The timestamp after which the signature is valid.
     * @return The packed validation data.
     */
    function pack(uint256 validUntil, uint256 validAfter) internal pure returns (uint256) {
        return (uint256(validUntil) << 192) | (uint256(validAfter) << 128);
    }

    /**
     * @dev Deposits funds into the paymaster.
     */
    function deposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @dev Withdraws funds from the paymaster.
     * @param to The address to withdraw the funds to.
     * @param amount The amount of funds to withdraw.
     */
    function withdrawTo(address payable to, uint256 amount) public onlyOwner {
        entryPoint.withdrawTo(to, amount);
    }

    /**
     * @dev Gets the deposit of the paymaster.
     * @return The deposit of the paymaster.
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @dev Receive function to receive Ether.
     */
    receive() external payable {}
}