const Trip = require('../models/Trip');

exports.searchTrips = async (req, res) => {
    const { from, to, date } = req.query;

    try {
        const trips = await Trip.find({
            from,
            to,
            date
        });

        res.render('tickets/search', {
            results: trips,
            searchParams: { from, to, date }
        });

    } catch (err) {
        console.error(err);
        res.status(500).render("error", { message: "Error fetching trips" });
    }
};