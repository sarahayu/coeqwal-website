import React from "react";

export function CallToExploreSection({ onClick }) {
    return (
        <div className="cte">
            <div className="cte-container">

                Thus, tradeoffs must often be made when managing California's water
                supply. What are the ways we can manage California's water, and how do
                their outcomes compare? Go to the next step to find out!
                <button className="fancy-font" onClick={onClick}>
                    click to explore!
                </button>
            </div>
        </div>
    );
}
