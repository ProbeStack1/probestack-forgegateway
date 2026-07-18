import { useEffect, useState } from "react";
import { APIGEE_ENDPOINTS } from "../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../services/apigeeApiService";

const normalizeNameList = (data, primaryKey) => {
    const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.[primaryKey])
            ? data[primaryKey]
            : [];

    return rawList
        .map((item) => (
            typeof item === "string"
                ? item
                : item?.organization || item?.projectId || item?.name || item?.displayName || item?.id
        ))
        .filter(Boolean);
};

export default function useApigeeOrgEnvironmentOptions(selectedOrganization) {
    const [organizations, setOrganizations] = useState([]);
    const [environments, setEnvironments] = useState([]);
    const [isFetchingOrganizations, setIsFetchingOrganizations] = useState(false);
    const [isFetchingEnvironments, setIsFetchingEnvironments] = useState(false);

    useEffect(() => {
        const fetchOrganizations = async () => {
            setIsFetchingOrganizations(true);
            try {
                const res = await apigeeApiFetch(APIGEE_ENDPOINTS.ORGANIZATIONS.LIST);
                const data = await res.json();
                setOrganizations(normalizeNameList(data, "organizations"));
            } catch (error) {
                console.error("Failed to fetch organizations", error);
                setOrganizations([]);
            } finally {
                setIsFetchingOrganizations(false);
            }
        };

        fetchOrganizations();
    }, []);

    useEffect(() => {
        const fetchEnvironments = async () => {
            if (!selectedOrganization) {
                setEnvironments([]);
                return;
            }

            setIsFetchingEnvironments(true);
            try {
                const res = await apigeeApiFetch(APIGEE_ENDPOINTS.ENVIRONMENT.LIST(selectedOrganization));
                const data = await res.json();
                setEnvironments(normalizeNameList(data, "environments"));
            } catch (error) {
                console.error("Failed to fetch environments", error);
                setEnvironments([]);
            } finally {
                setIsFetchingEnvironments(false);
            }
        };

        fetchEnvironments();
    }, [selectedOrganization]);

    return {
        organizations,
        environments,
        isFetchingOrganizations,
        isFetchingEnvironments,
    };
}
