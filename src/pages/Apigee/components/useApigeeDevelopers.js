import { useEffect, useState } from "react";
import { APIGEE_ENDPOINTS } from "../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../services/apigeeApiService";

const normalizeDeveloperList = (data) => {
    const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.developers)
            ? data.developers
            : Array.isArray(data?.developer)
                ? data.developer
                : [];

    return rawList
        .map((item) => (
            typeof item === "string"
                ? item
                : item?.email || item?.developerEmail || item?.userName || item?.name || item?.id
        ))
        .filter(Boolean);
};

export default function useApigeeDevelopers(organization) {
    const [developers, setDevelopers] = useState([]);
    const [isFetchingDevelopers, setIsFetchingDevelopers] = useState(false);

    useEffect(() => {
        const fetchDevelopers = async () => {
            if (!organization) {
                setDevelopers([]);
                return;
            }

            setIsFetchingDevelopers(true);
            try {
                const res = await apigeeApiFetch(APIGEE_ENDPOINTS.DEVELOPERS.LIST(organization));
                const data = await res.json();
                setDevelopers(normalizeDeveloperList(data));
            } catch (error) {
                console.error("Failed to fetch developers", error);
                setDevelopers([]);
            } finally {
                setIsFetchingDevelopers(false);
            }
        };

        fetchDevelopers();
    }, [organization]);

    return { developers, isFetchingDevelopers };
}
