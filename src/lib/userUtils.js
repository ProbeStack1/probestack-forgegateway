/**
 * Formats a name (which could be an email) into a more human-readable display name.
 * 
 * @param {string} name - The name or email to format
 * @returns {string} - The formatted display name
 */
export const formatDisplayName = (name) => {
    if (!name || typeof name !== "string") return "Developer";

    // Check if it's an email (contains @)
    if (name.includes("@")) {
        // Extract the part before @
        const beforeAt = name.split("@")[0];

        // Replace dots, underscores, and hyphens with spaces for better readability
        let formatted = beforeAt
            .replace(/[._-]/g, " ")
            .trim();

        // Capitalize first letter of each word
        formatted = formatted
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");

        // If empty after processing, return a default
        return formatted || "Developer";
    }

    // If it's not an email, just capitalize the first letter of each word
    return name
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

/**
 * Retrieves the display name from localStorage with priority:
 * 1. userFirstName
 * 2. userName (formatted)
 * 3. userEmail (formatted)
 * 
 * @returns {string} - The determined display name
 */
export const getDisplayName = () => {
    const userFirstName = localStorage.getItem("userFirstName");
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");

    if (userFirstName && userFirstName.trim() && userFirstName !== "Developer") {
        return formatDisplayName(userFirstName);
    }

    if (userName && userName.trim()) {
        const trimmed = userName.trim();
        if (trimmed.includes("@")) {
            return formatDisplayName(trimmed);
        }
        // Take the first word if it's a full name
        return trimmed.split(/\s+/)[0].charAt(0).toUpperCase() + trimmed.split(/\s+/)[0].slice(1).toLowerCase();
    }

    if (userEmail && userEmail.trim()) {
        return formatDisplayName(userEmail.trim());
    }

    return "Developer";
};
