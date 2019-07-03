"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
const firebase_api_1 = require("../firebase/firebase-api");
const auth_api_1 = require("./auth-api");
const shortid = require("shortid");
class VoterApi {
    static createEndpoints(app) {
        app.get("/getVoter", function (req, res) {
            log_1.logger.message("GET /getVoter", log_1.logger.parseExpress(req, res));
            return VoterApi.getVoter(req.query.id, res);
        });
        app.get("/createVoter", function (req, res) {
            log_1.logger.message("GET /createVoter", log_1.logger.parseExpress(req, res));
            return auth_api_1.authApi
                .firebaseTokenAuth(req)
                .then(uid => {
                if (uid)
                    return VoterApi.createVoter(req, res);
                else
                    return log_1.Errors.authFailed(req, res);
            })
                .catch((msg) => {
                return log_1.Errors.onCatch(res, msg);
            });
        });
    }
    static getVoter(phone, res) {
        const phoneKey = phone.replace(/[^0-9\.]+/g, "").trim();
        return firebase_api_1.firebaseApi
            .firestore()
            .collection("voters")
            .doc(phoneKey)
            .get()
            .then((data) => {
            const result = {
                exists: data.exists,
                phone: data.get("phone"),
                uid: data.get("uid"),
                voterId: data.get("voterId")
            };
            console.log("gvr", result);
            console.log("res", res);
            if (res)
                return res.json(result);
            return result;
        })
            .catch((err) => {
            return { exists: false, err: err };
        });
    }
    static voterIdExists(voterId) {
        log_1.logger.debug("voterIdExists", voterId);
        return firebase_api_1.firebaseApi
            .firestore()
            .collection("voters")
            .where("voterId", "==", voterId)
            .get()
            .then((data) => {
            return data.docs && data.docs.length > 0;
        })
            .catch(function (err) {
            return false;
        });
    }
    // recursive function to keep generating a voterId until it's unique
    static newVoterId(attempts) {
        if (attempts > 5) {
            log_1.logger.error("newVoterId too many attempts.");
            return new Promise(() => {
                return "";
            });
        }
        const voterId = shortid.generate();
        return this.voterIdExists(voterId).then(exists => {
            if (!exists)
                return voterId;
            else
                return VoterApi.newVoterId(attempts + 1);
        });
    }
    static createVoter(req, res) {
        try {
            const uid = req.query.uid, phone = req.query.id.trim();
            // if the voter exists
            return this.getVoter(phone).then(data => {
                const existingVoter = data;
                // if Voter already exists, return that
                if (existingVoter.exists &&
                    existingVoter.voterId &&
                    existingVoter.voterId.length)
                    return res.json(existingVoter);
                // Voter does not exist, create a new unique voterId first
                else
                    return VoterApi.newVoterId(0)
                        .then(function (voterId) {
                        const voter = {
                            phone: phone,
                            uid: uid.trim(),
                            voterId: voterId.trim()
                        };
                        log_1.logger.message("Creating new voter: " + JSON.stringify(voter));
                        // now create the Voter
                        return firebase_api_1.firebaseApi
                            .firestore()
                            .collection("voters")
                            .doc(phone)
                            .set(voter)
                            .then(() => {
                            return res.json(voter);
                        })
                            .catch(function (err) {
                            return log_1.Errors.onCatch(res, err);
                        });
                    })
                        .catch(() => {
                        return log_1.Errors.onCatch(res, req);
                    });
            });
        }
        catch (error) {
            return log_1.Errors.onCrash(res, error);
        }
    }
}
exports.VoterApi = VoterApi;
//# sourceMappingURL=voters.js.map