// Apartment data configuration
const apartmentData = {
    aqua2108: {
        building: "BW Aqua building",
        apartment: "2108",
        parking: "376",
        level: "-2",
        address: "Hercegovačka 23"
    },
    aqua706: {
        building: "BW Aqua building",
        apartment: "706",
        parking: "49",
        level: "-1",
        address: "Hercegovačka 23"
    },
    aqua707: {
        building: "BW Aqua building",
        apartment: "707",
        parking: "48",
        level: "-1",
        address: "Hercegovačka 23"
    },
    parkview2110: {
        building: "Parkview building",
        apartment: "2110",
        parking: "450",
        level: "-2",
        address: "Bulevar Vudroa Vilsona 8"
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apartmentData;
}
