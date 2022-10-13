const ethers = require('ethers')
const fetch = require('node-fetch')
const Semaphore = require('async-mutex').Semaphore;
const provider = new ethers.providers.Web3Provider(window.ethereum)

 async function getReclaimStatusAndPrint(beraArr, contract, canClaimBaby, canClaimBand, htmlTable) {
    const abi = '[{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"hasClaimedRebase","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]'

    const bitContract = new ethers.Contract(
        '0x32bb5a147b5371fd901aa4a72b7f82c58a87e36d',
        JSON.parse(abi),
        provider
    )

    const semaphore = new Semaphore(5);

    beraArr.forEach(async (bear, idx) => {
        const [value, release] = await semaphore.acquire();

        try {     
            let row = await getBeraStats(bear, contract, canClaimBaby, canClaimBand , bitContract)
            htmlTable.appendChild(row)
        }
        catch (error) {
            console.log("request failed.")
        }
        finally {
            release();
        }
    })
}

async function getBeraStats(bear, contract, canClaimBaby, canClaimBand , bitContract) {
    const BABY_BEARS_SLOT_NUM = 18;
    const BAND_BEARS_SLOT_NUM = 16;
   
    const BABY_BEARS = '0x9E629D779bE89783263D4c4A765c38Eb3f18671C';
    const BAND_BEARS = '0xB4E570232D3E55D2ee850047639DC74DA83C7067';

    let row = document.createElement("tr");
    let name = document.createElement("td");
    let claimedBit = document.createElement("td");

    let encoded = ethers.utils.solidityPack(['address','uint256'],[contract, parseInt(bear.tokenId)]);
    let hash = ethers.utils.keccak256(encoded);
    let res = await bitContract.hasClaimedRebase(hash);
    let bitDisplayStr;
    let unclaimed = false;
    
    if (res) {
        bitDisplayStr = String.fromCharCode(0x2705)
    } else {
        bitDisplayStr = String.fromCharCode(0x274C)
        unclaimed = true;
    }
    
    name.innerText = bear.name;
    row.appendChild(name);
    claimedBit.innerText = bitDisplayStr;
    row.appendChild(claimedBit);

    if (canClaimBaby) {
        let claimedBaby = await getRebasedAtStorageSlot(BABY_BEARS, hash, BABY_BEARS_SLOT_NUM, ethers, provider);
        let babyDisplayStr;
        
        if (claimedBaby === 1) {
            babyDisplayStr = String.fromCharCode(0x2705)
        } else {
            babyDisplayStr = String.fromCharCode(0x274C)
            unclaimed = true;
        }
        
        
        let babyCell = document.createElement("td");
        babyCell.innerText = babyDisplayStr;
        row.appendChild(babyCell);
    }
    
    if (canClaimBand) {
        let claimedBand = await getRebasedAtStorageSlot(BAND_BEARS, hash, BAND_BEARS_SLOT_NUM, ethers, provider);
        let bandDisplayStr;
        
        if (claimedBand === 1) {
            bandDisplayStr = String.fromCharCode(0x2705)
        } else {
            bandDisplayStr = String.fromCharCode(0x274C)
            unclaimed = true;
        }

        let bandCell = document.createElement("td");
        bandCell.innerText = bandDisplayStr;
        row.appendChild(bandCell);
    }

    let hashCell = document.createElement("td");
    hashCell.innerText = hash;
    row.appendChild(hashCell);

    if (unclaimed) {
        row.classList.add("unclaimed")
    }

    return row;
}

/*
 * https://docs.soliditylang.org/en/v0.8.14/internals/layout_in_storage.html#mappings-and-dynamic-arrays
 */
async function getRebasedAtStorageSlot(contract, hash, slotNum) {
    const abiCoder = new ethers.utils.AbiCoder();
    
    const encoded = abiCoder.encode(
        ["bytes32", "uint256"],
        [hash, slotNum]
    );

    const slot = ethers.utils.keccak256(encoded);
    const res = ((await provider.getStorageAt(contract, slot)));
    return ethers.utils.stripZeros(res)[0]
}

 async function init(cachedBears) {
    const bondLimit = 126;
    const booLimit = 271;
    const babyLimit = 571;
    const bandLimit = 1175;

    for (let i = 1; i < bondLimit+1; i++) {
        cachedBears.bond.push({tokenId:i, name: `bond ${i}`})
    }

    for (let i = 1; i < booLimit+1; i++) {
        cachedBears.boo.push({tokenId:i, name: `boo ${i}`})
    }

    for (let i = 1; i < babyLimit+1; i++) {
        cachedBears.baby.push({tokenId:i, name: `baby ${i}`})
    }

    for (let i = 1; i < bandLimit+1; i++) {
        cachedBears.band.push({tokenId:i, name: `band ${i}`})
    }
}

module.exports = { 'init' : init, 'getReclaimStatusAndPrint' : getReclaimStatusAndPrint }