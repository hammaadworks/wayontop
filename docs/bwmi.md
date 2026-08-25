# Build What Moves India (BWMI) Hackathon - Lalbagh.top Strategy

## 1. Overview
**Build What Moves India** is a hackathon presented by Varun Mayya x OpenAI to rethink and rebuild Indian public service websites and digital journeys.

- **Website:** [buildwhatmovesindia.com](https://buildwhatmovesindia.com)
- **Deadline:** August 28, 2026 at 8:00 PM IST
- **Team Size:** Solo or Team of 2 (Hammaad + 1 optional)
- **Finale:** September 12, 2026 in Bengaluru (Top 10 Finalists)
- **Prizes:** Codex Pro, MacBook, Trip to San Francisco

## 2. The Challenge & Our Fit
**The Prompt:** *Pick one real problem you have faced on an Indian public-service website or digital service. Then build a simpler, clearer and more useful way to solve it.*

**Our Pitch (`lalbagh.top`):** 
Lalbagh Botanical Garden is a massive 240-acre public space managed by the Directorate of Horticulture. The "public service" problem here is physical navigation and information discovery. Visitors get lost, miss key attractions, and lack digital infrastructure. Our AR Navigator solves a real-world public service problem by transforming how citizens experience government-managed public spaces, using zero-friction web AR.

## 3. The OpenAI / Codex Requirement (Crucial)
**Rule:** *Your prototype should be built with Codex or powered by an OpenAI model.*

How we fulfill this:
1. **Built with AI (Process):** We can heavily document that the platform (Producer/Consumer) was developed using AI coding agents.
2. **Powered by AI (Product):** To strictly meet the "powered by an OpenAI model" requirement, we must integrate OpenAI into the product experience.
    - *Idea 1 (Search):* The **AI Intent-Based Fuzzy Search** (mentioned in the PRD) can be powered by OpenAI. If a user searches "where can I take kids" or "sunset spots", the LLM maps the intent to the correct POI graph nodes.
    - *Idea 2 (Content Generation):* Live generation of POI info cards or localized translation of historical facts about Lalbagh using OpenAI.

## 4. Submission Requirements
By **August 28, 8:00 PM IST**, we need to submit:
1. **Live Public Link:** `lalbagh.top` (Must work in browser, no login walls. We use mock accounts/data if needed).
2. **2-Minute Video:** 
    - Minute 1: Demo the project as a citizen navigating the park.
    - Minute 2: Explain how it was built, why we made these choices, and how OpenAI/Codex was used.
3. **Project Summary (Under 250 words):** Explain what it is and why it's better than current static maps/signage.

## 5. Rules & Constraints to Watch Out For
- **No real sensitive data:** Do not use real user data. (Our app uses anonymous device UUIDs anyway).
- **No official endorsement:** We must not use the official Karnataka Govt/Lalbagh logos in a way that suggests they endorsed this. Add a clear disclaimer: *"Independent Hackathon Prototype."*
- **Mock what's needed:** We can use mock data or synthetic accounts for demonstration purposes.

## 6. Execution Plan & Next Steps
1. **Develop the core app (3-Day Build):** Finish the AR Navigator as per the existing PRD.
2. **Integrate OpenAI:** Implement an OpenAI-powered feature (like the Intent-Based Search) to explicitly meet the hackathon criteria.
3. **Record the Demo:** Do a real-world walkthrough video at Lalbagh to prove the "Main Journey works".
4. **Draft the 250-word pitch:** Highlight usability for all citizens (accessible, works on slow networks via Service Worker cache).
5. **Submit:** Form link is on their site.
