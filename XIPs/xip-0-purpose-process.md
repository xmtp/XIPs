---
xip: 0
title: XIP purpose, process, and guidelines
discussions-to: https://community.xmtp.org/t/xip-0-xip-purpose-process-guidelines/475
status: Living
type: Process
author: Matt Galligan (@mg0716), et al
created: 2022-02-22
updated: 2024-03-14
---

## What is an XIP?

XIP stands for XMTP Improvement Proposal.

An XIP is a design document that provides information to the XMTP community about:

- A new feature for XMTP

- An improvement to XMTP processes or environment

"Environment" may refer to technical infrastructure, standards, software libraries, or network operations.

The XIP author and editor should ensure an XIP provides a concise technical specification and rationale for its proposed feature or improvement.

## The purpose of XIPs

XIPs address the need for a standardized, transparent process for proposing, discussing, and integrating new features for XMTP. 

XIPs offer a structured proposal system that ensures comprehensive community participation and informed decision-making.

The XIP repository, with its comprehensive revision history, serves as a source for technical exchange and an archival record of XMTP's evolution and the contributors who made it possible.

For XMTP implementers, XIPs are a convenient way to track the progress of their implementation. Ideally, each implementer will list the XIPs they have implemented, providing end users with the current status of a given implementation or library.

## XIP types

There are three major types of XIPs, along with more specific categories.

### Standards XIP

A **Standards** XIP describes any changes that affect most or all XMTP implementations or the interoperability of applications using XMTP. Within the **Standards** category, XIPs are further categorized as follows:

- **Core**: Includes proposals for rules and behavior around message relay by nodes, node incentive strategies, and backward-incompatible changes that require a consensus fork

- **Interface**: Includes client API/RPC specifications and improvements for how clients interact with the network

- **Network**: Includes networking specifications and proposals for how nodes communicate and interoperate

- **Storage**: Includes specifications and proposals for the persistent storage of messages by or on behalf of clients

- **XRC** (XMTP Request for Comment): Includes application-level standards and conventions, such as message payload formats and applications

### Process XIP

A **Process** XIP describes a new process or changes to an existing process surrounding XMTP. These XIPs may propose an implementation but do not modify the XMTP codebase. 

They often require community consensus and are more than mere recommendations. However, unlike **Informational** XIPs, the community cannot ignore them.

### Informational XIP

An **Informational** XIP provides general guidelines or information to the XMTP community without proposing a new feature. 

These XIPs do not necessarily reflect an XMTP community consensus or recommendation, allowing users and implementors to disregard or heed their advice.

## Start with an idea

Gathering feedback from the community before advancing your idea through the XIP process is essential. This early feedback helps validate your idea, assess its originality, and measure community interest. This preparatory step can save you time and effort by ensuring your idea is novel and has not been previously proposed or rejected.

Additional validation may involve reviewing reference implementations or assessing whether the idea is too specific for broad adoption within the XMTP ecosystem. It’s important to gauge whether the level of interest from the community is commensurate with the effort required to implement your idea. While the amount of discussion does not automatically qualify or disqualify an idea, it can influence its progression beyond the initial stage.

**To get started with your idea:**

1. Post your idea as a new topic in the [Ideas & Improvements category](https://community.xmtp.org/c/development/ideas/54) in the XMTP Community Forums.

1. If you've built a prototype for your idea, share it in your post. A prototype can clarify your idea and foster discussion.

1. Include a due date for feedback, typically allowing about two weeks, including two weekends, to ensure adequate response time.

1. Share your idea with the XMTP community, including developers, reviewers, and editors. Beyond posting to the XMTP Community Forums, consider sharing your idea across your networks on other platforms.

1. Request feedback that will enable you to validate, measure overall interest in, and assess the originality of your idea, potentially saving you time and effort.  
 
After you feel your idea has received enough feedback, create an XIP draft for it as described in the next section. A good standard for "enough feedback" is at least one comment from an XMTP community member and one from an XMTP Core Developer (currently the XMTP Labs team).

## Start the XIP process

Following the validation of an idea, the author can present it as a formal XIP draft. The author is then responsible for shepherding it through the XIP process.

Each XIP should focus on a single key proposal or idea. A focused XIP is more likely to succeed. If in doubt, divide your XIP into multiple, well-focused XIPs. A change affecting only one client doesn’t need an XIP, but changes that affect multiple clients or establish a standard for multiple apps do.

An XIP must fulfill certain minimum criteria:

- It must provide a clear, complete description of the proposed enhancement.

- It must represent a net improvement.

- If the XIP includes an implementation, it must be solid and not unduly complicate the protocol.

### Draft status

This is the first formally tracked stage of an XIP. 

1. The XIP author uses the [XIP template](../xip-template.md) to create the XIP draft, adhering to the guidelines in this document.  

   The draft filename should use this format `xip-short-title.md`, where `short-title` is a dash-separated shortened version of the XIP title.

1. The XIP author opens a pull request in the **XIPs** directory of this repository. The pull request should include the proposal title.

1. The XIP author sets the XIP's **status** to `Draft` and tags the [XIP editors](#xip-editors-and-responsibilities) for review.

1. An XIP editor assigns an XIP number. This is generally the next sequential number, but the decision is up to the editor.

1. The XIP editor adds the XIP number to the filename. When assigning an XIP number, the filename should use a format like `xip-n-short-title.md`, where `n` is the XIP number.

1. The XIP editor creates an [XIP Draft](https://community.xmtp.org/c/xips/xip-drafts/53) forum topic that includes the XIP text (except the Preamble) and assigns ownership of the topic to the XIP author.

1. The XIP editor copies the forum topic URL and sets it as the **discussions-to** value in the XIP draft pull request.

1. The XIP editor merges the corresponding pull request and sends a message to the XIP author with next steps.

The XIP author uses the forum topic to gather feedback from the community and at least one XMTP Core Developer. The XIP author is responsible for building consensus and documenting dissenting opinions. 

The XIP author may work with XIP editors to open pull requests against their merged XIP draft to update it to address feedback in preparation for the review phase.

### Review status

1. After the XIP in `Draft` status is accurate and complete to the best of the XIP author's knowledge, they open a pull request against the XIP to update the **status** to `Review` and tag the XIP editors. This status indicates that the XIP is ready for review by XMTP Core Developers.

2. An XIP editor merges the pull request and starts the XIP review with XMTP Core Developers. During this phase, XMTP Core Developers perform a final validation of the XIP's technical approach and accuracy. XMTP Core Developers provide their feedback to the XIP author.

### Last call status

1. After addressing any necessary revisions and coming to a consensus that the XIP is sound and complete, the XMTP Core Developers contact the XIP author and XIP editors.

1. An XIP editor sets the **status** to `Last call` and **last-call-deadline** to a review end date typically 14 days later. If normative changes are necessary during this period, the XIP reverts to `Review` status.  

   Normative changes affect the standards, rules, or main functionality described in the XIP. These changes do not include typo fixes, example updates, text clarifications, or other alterations that don't change the technical specifications.

### Final status

If the XIP is an **Informational** or **Process** XIP, it automatically goes into **Final** status after the 14-day **Last call** period. 

An XIP in **Final** status exists in this status permanently and can be updated only to correct errata and add non-normative clarifications.

If the XIP is a **Standards** XIP, it does not automatically go into **Final** status but requires adequate adoption specific to each XIP category, as follows:

- **Core**: Core XIPs fundamentally affect the protocol and require widespread consensus to ensure network integrity and continuity. For a Core XIP to move into Final status, it should be adopted by at least 75% of the node operators and validated through a successful testnet phase lasting no less than 30 days. This ensures that the changes are robust, backward-compatible where necessary, and do not unduly disrupt the network.

- **Network**: Network XIPs are critical for the communication and interoperability of nodes within the network. For a Network XIP to move into Final status, it should demonstrate successful implementation in a controlled environment (testnet) for a minimum period of 30 days. After this testing phase, it should be adopted by at least 60% of the nodes operating on the network, ensuring that the majority of the network's infrastructure supports the new standards or protocols. This wide adoption signifies a strong consensus within the community and solidifies the XIP's status as Final.

- **Interface**: Interface XIPs enhance how clients interact with the network, affecting developers and end-users. For an Interface XIP to move into Final status, it should be adopted by a majority (over 50%) of client applications, as demonstrated by updates in their official release versions. Client feedback via community forums or surveys indicating positive reception and improved interaction experiences can also support this transition.

- **Storage**: Storage XIPs deal with the persistence, accessibility, and security of messages. For a Storage XIP to move into Final status, it should be adopted by all major storage providers within the XMTP ecosystem, with no reported data loss or accessibility issues for a continuous period of 90 days. This ensures that the storage changes are practical, secure, and benefit the network without compromising data integrity.

- **XRC** (XMTP Request for Comment): XRCs propose standards and conventions at the application level. For an XRC XIP to move into Final status, it should be adopted by over 60% of new projects or updates to existing applications within the XMTP ecosystem within three months of the XIP entering the Last Call phase. Additionally, a survey of developers and users indicating that the standards or conventions introduced have positively impacted development practices or user experiences would further validate the move to Final status.

### Other special statuses

- **Living**: This status applies to an XIP intended to be continually updated. Instead of moving to `Final` status, this XIP moves to `Living` status. Most notably, this includes XIP-0.

- **Stagnant**: This status applies to an XIP in `Draft`, `Review`, or `Last call` status without activity for over six months. An XIP editor will automatically set its status to `Stagnant`. The XIP author or XIP editor may resurrect the XIP from this state by changing its status back to `Draft` or its earlier status. If not resurrected, an XIP can stay in this status permanently.

- **Withdrawn**: An XIP author can withdraw their XIP by setting its status to `Withdrawn`. This state is permanent. No one can resurrect the XIP using the same XIP number. If someone wants to pursue the XIP again, they must create a new proposal with a new XIP number.

## What belongs in an XIP?

XIPs should be written in Markdown format using this [XIP template](/xip-template.md).

## XIP header preamble

Each XIP must begin with an RFC 822-style header preamble, preceded and followed by three hyphens (---), as shown in the XIP template.

For headers that permit lists of items, separate items with commas.

For headers that require dates, use ISO 8601 format (YYYY-MM-DD).

Headers must appear in the following order:

### xip

An XIP author should not provide this value. An XIP editor will assign the XIP number.

### title

A short descriptive title, limited to 44 characters. It should not include the XIP number. 

### description

A description of the XIP, limited to 140 characters. It should not include the XIP number.

### author

List the names and email addresses, GitHub usernames, or ENS domains of the XIP authors. Authors who prefer anonymity may use a GitHub username only or a first name and GitHub username.

To include an email address, GitHub username, or ENS domain, you must use one of these formats:

- Alix A. User &lt;alixauser@example.com&gt;

- Bo B. User (@bobusername)

- Caro C. User (carocuser.eth)

Do not use more than one of the following with a single author value: email address, GitHub username, or ENS domain.

If it is important to include more than one, include the author value twice, once with the email and once with the GitHub username, for example.

At least one author must use a GitHub username to enable notifications for change requests and the ability to approve or reject them.

### discussions-to

While an XIP is in `Draft` status, a **discussions-to** header indicates the URL where the XIP is being discussed.

The preferred discussion URL is a topic in the XIP Drafts forum. The URL must not point to GitHub pull requests, any URL that is ephemeral, or any URL that can be locked over time, such as a Reddit topic.

### status

The status of the XIP: `Draft`, `Review`, `Last call`, `Final`, `Stagnant`, `Withdrawn`, or `Living`. To learn more, see [Start the XIP process](#start-the-xip-process).

### last-call-deadline

XIPs in `Last call` status should have a **last-call-deadline** header. The **last-call-deadline** header records the date that the last-call review period ends. The header should be in `YYYY-MM-DD` format, e.g. `2009-01-12`.

### type

The **type** header specifies the XIP's type: `Standards`, `Process`, or `Informational`. To learn more, see [XIP types](#xip-types).

### category

This is required for `Standards` XIPs only. It specifies the XIP's category: `Core`, `Network`, `Interface`, `Storage`, or `XRC`. To learn more, see [XIP types](#xip-types).

### created

The **created** header records the date the XIP was assigned a number. It should be in `YYYY-MM-DD` format, e.g. `2009-01-12`.

### replaces

XIPs may have a **replaces** header, indicating that the XIP replaces the designated XIP number.

### requires

XIPs may have a **requires** header, indicating the XIP numbers that this XIP depends on.

### superceded-by

XIPs may have a **superceded-by** header, indicating that the XIP is superceded, or replaced by, the designated XIP number.

### updated

XIPs in `Living` status should have an updated header. It records the date the XIP was updated and should be in `YYYY-MM-DD` format, e.g. `2009-01-12`.

### withdrawal-reason

XIPs in `Withdrawn` status should have a **withdrawal-reason**, which is a sentence that explains why the XIP was withdrawn.

## XIP numbers and linking to other XIPs

When referring to an XIP by number, write it in hyphenated form `XIP-N`, where `N` is the XIP's assigned number.

Links to other XIPs should follow the format `XIP-N` where `N` is the XIP number you refer to. An XIP referenced in an XIP **MUST** be accompanied by a relative link upon its first reference. A link upon subsequent references MAY accompany it.

Links MUST always use relative paths so that the links work in this GitHub repository, forks of this repository, the main XIPs site, mirrors of the main XIP site, and so forth. For example, you would link to this XIP with `[XIP-0](./XIPs/xip-0-purpose-process.md))`.

## Auxiliary files

Images, diagrams, and auxiliary files should be included in the `../assets` folder subdirectory as follows: `../assets/xip-n`, where `n` is to be replaced with the XIP number. When linking to a file in the XIP, use relative links such as `../assets/xip-0/image.png`.

## Transferring XIP ownership

Occasionally, transferring ownership of XIPs to a new champion is necessary.

A good reason to transfer ownership is that the original author no longer has the time or interest to update the XIP or follow through with the XIP process. It may also be that the author has fallen off the face of the ‘net (i.e., is unreachable or isn’t responding to email).

A bad reason to transfer ownership is because you don’t agree with the direction of the XIP. We try to build consensus around an XIP, but if that’s not possible, you can always submit a competing XIP.

If you want to assume ownership of an XIP, send a message to the original author and the XIP editor asking to take over. If the original author doesn’t respond to the email in a timely manner, the XIP editor will make a unilateral decision.

Retaining the original author as a co-author of the transferred XIP is ideal, but that’s up to the original author.

## XIP editors and responsibilities

The current XIP editors are:

- Matt Galligan (@galligan)
- Saul Carlin (@saulmc)
- Jennifer Hasegawa (@jhaaaa)

The editors don't pass judgment on XIPs. They merely perform administrative and editorial tasks.

For each new XIP proposal submitted as a pull request, an editor does the following:

- Reads the XIP to check if it is sound and complete. The proposal must make technical sense, even if it doesn't seem likely to get to final status.

- Ensures that the title accurately describes the content.

- Checks the XIP for correct spelling, grammar, sentence structure, markup (GitHub-flavored Markdown), and code style.

If the XIP isn't ready, the editor sends it back to the author for revision with specific instructions.

To learn more about XIP editor tasks, see [Start the XIP process](#start-the-xip-process).

Many XIPs are written and maintained by developers with write access to the **xmtp** GitHub organization codebase. The XIP editors monitor XIP changes and may correct any structural, grammatical, spelling, and markup mistakes.

## History

This document was derived heavily from [Ethereum's EIP-1](https://eips.ethereum.org/EIPS/eip-1), which was derived from [Bitcoin's BIP-0001](https://github.com/bitcoin/bips) written by Amir Taaki, which in turn was derived from [Python's PEP-0001](https://www.python.org/dev/peps/). In many places, text was simply copied and modified. Although the PEP-0001 text was written by Barry Warsaw, Jeremy Hylton, and David Goodger, they are not responsible for its use in the XMTP Improvement Process and should not be bothered with technical questions specific to XMTP or the XIP. Please direct all comments to the XIP editors.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
