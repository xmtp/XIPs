---
xip: 0
title: XIP purpose, process, and guidelines
discussions-to: https://community.xmtp.org/t/xip-0-xip-purpose-process-guidelines/475
status: Living
type: Process
author: Matt Galligan (@mg0716), et al
created: 2022-02-22
updated: 2025-10-02
---

## What is an XIP?

XIP stands for XMTP Improvement Proposal.

An XIP is a design document that provides information to the XMTP community about:

- A new feature for XMTP

- An improvement to XMTP processes or environment

*Environment* may refer to technical infrastructure, standards, software libraries, or network operations.

The XIP author and editor should ensure an XIP provides a concise technical specification and rationale for its proposed feature or improvement.

## Purpose of XIPs

XIPs address the need for a standardized, transparent process for proposing, discussing, and integrating new features for XMTP.

XIPs also offer a structured proposal system that enables permissionless community participation and informed decision-making.

The XIPs GitHub repository, with its comprehensive revision history, serves as a source for technical exchange and an archival record of XMTP's evolution and the contributors who made it possible.

For XMTP implementers, XIPs are a convenient way to track the progress of their implementations. Ideally, each implementer will list the XIPs they have implemented, providing their users with the current status of a given implementation or library.

## XIP types

There are three types of XIPs:

- Standards
- Process
- Informational

### Standards XIP

Describes any changes that affect most or all XMTP implementations or the interoperability of applications using XMTP.

Within the **Standards** type, XIPs are further categorized as follows:

- **Core**: Includes proposals for rules and behavior around message relay by nodes, node incentive strategies, and backward-incompatible changes that require a consensus fork

- **Interface**: Includes client API/RPC specifications and improvements for how clients interact with the network

- **Network**: Includes networking specifications and proposals for how nodes communicate and interoperate

- **Storage**: Includes specifications and proposals for the persistent storage of messages by or on behalf of clients

- **XRC** (XMTP Request for Comment): Includes application-level standards and conventions, such as message payload formats and applications

### Process XIP

Describes a new process or changes to an existing XMTP process. These XIPs may propose an implementation but do not modify the XMTP codebase.

They often require community consensus and are more than mere recommendations. However, unlike **Informational** XIPs, the community cannot ignore them.

### Informational XIP

Provides general guidelines or information to the XMTP community without proposing a new feature.

These XIPs do not necessarily reflect an XMTP community consensus or recommendation, allowing users and implementers to disregard or heed their advice.

## Start with an idea

Gathering feedback from the community before advancing an idea through the XIP process is essential. This early feedback helps validate an idea, assess its originality, and measure community interest. Feedback may also involve reviewing reference implementations or assessing whether the idea is too specific for broad adoption within the XMTP ecosystem.

Starting with an idea also enables gauging whether the level of interest from the community is commensurate with the effort required to implement an idea. While the amount of discussion does not automatically qualify an idea, it can influence its progression beyond the initial stage.

This preparatory step can help save time and effort by ensuring the idea is original, appropriate, and useful before entering the XIP process.

**To get started with an idea:**

1. Post the idea as a new topic in the [Ideas & Improvements category](https://community.xmtp.org/c/development/ideas/54) in the XMTP Community Forums.

1. If there is a prototype for the idea, share it in the post. A prototype can clarify the idea and foster discussion.

1. Include a due date for feedback, typically allowing about two weeks, including two weekends, to ensure adequate response time.

1. Share the idea with the XMTP community, including developers, reviewers, and editors. Beyond posting to the XMTP Community Forums, consider sharing the idea across networks on other platforms.

1. Request feedback that will enable validation of, measurement of interest in, and assessment of the originality of the idea, potentially saving time and effort.  

After the idea has received enough feedback expressing interest in the idea, create an XIP draft for it as described in the next section. A good standard for "enough feedback" is at least one comment from an XMTP community member and one from an XMTP core developer (currently the XMTP Labs team).

## Start the XIP process

Following the validation of an idea, the author can present it as a formal XIP draft. The author is then responsible for shepherding it through the XIP process.

Each XIP should focus on a single key proposal or idea. A focused XIP is more likely to succeed. If in doubt, divide the XIP into multiple, well-focused XIPs. A change affecting only one client doesn’t need an XIP, but changes that affect multiple clients or establish a standard for multiple apps do.

An XIP must fulfill certain minimum criteria:

- It must provide a clear, complete description of the proposed enhancement.

- It must represent a net improvement.

- If the XIP includes an implementation, it must be solid and not unduly complicate the protocol.

### XIP template

XIPs should be written in Markdown format using this [XIP template](../xip-template.md).

### Draft status

This is the first formally tracked status of an XIP.

1. The XIP author uses the [XIP template](../xip-template.md) to create the XIP draft, adhering to the guidelines in this document, and sets the XIP's **status** to `Draft`.  

   The draft filename should use the format `xip-short-title.md`, where `short-title` is a dash-separated shortened version of the XIP title.

1. The XIP author opens a pull request in the **XIPs** directory of this repository. The pull request title should include the proposal title.

1. The XIP author tags the [XIP editors](#xip-editors-and-responsibilities) for review.

1. An XIP editor assigns the draft an XIP number. This is generally the next sequential number, but the decision is up to the editor.

1. The XIP editor adds the XIP number to the draft filename. When assigning an XIP number, the filename should use the format `xip-n-short-title.md`, where `n` is the XIP number. They also perform the tasks in [XIP editors and responsibilities](#xip-editors-and-responsibilities).

1. The XIP editor creates a topic using the XIP text (except the preamble) in the [XIP draft](https://community.xmtp.org/c/xips/xip-drafts/53) discussion forum and assigns ownership of the topic to the XIP author.

1. The XIP editor copies the topic URL and sets it as the **discussions-to** value in the XIP draft pull request.

1. The XIP editor merges the draft pull request and contacts the XIP author with next steps.

The XIP author uses the topic to gather feedback. The XIP author is responsible for building consensus and documenting dissenting opinions.

The XIP author may update their XIP in preparation for the review phase.

### Review status

1. After the XIP in `Draft` status is accurate and complete to the best of the XIP author's knowledge, they open a pull request against the draft XIP to update the **status** to `Review` and tag the XIP editors. This status indicates that the XIP content is ready for review with XMTP core developers.

2. An XIP editor merges the pull request and the XIP review with XMTP core developers can start. During this phase, XMTP core developers perform a final validation of the XIP's technical approach and accuracy.

During this phase, the only changes made to the XIP are those coordinated between the XIP author and the XMTP core developers.

### Last call status

1. After addressing any necessary revisions and coming to a consensus that the XIP is sound and complete, the XMTP core developers notify the XIP author and editors.

1. An XIP editor sets the **status** to `Last call` and the **last-call-deadline** preamble header to a review end date typically 14 days later. If normative changes are necessary during this phase, the XIP reverts to `Review` status.  

   Normative changes are those that affect the standards, rules, or main functionality described in the XIP. These changes do not include typo fixes, example updates, text clarifications, or other alterations that don't change the technical specifications.

### Final status

If no normative changes are necessary during the 14-day last call period, an XIP editor sets the XIP's **status** to `Final`.

An XIP in **Final** status exists in this status permanently and can be updated only to correct errata and add non-normative clarifications.

### Other special statuses

- **Living**: This status applies to an XIP intended to be continually updated. Instead of moving to `Final` status, this XIP moves to `Living` status. Most notably, this includes XIP-0.

- **Stagnant**: This status applies to an XIP in `Draft`, `Review`, or `Last call` status without activity for over six months. An XIP editor will automatically set its status to `Stagnant`. The XIP author or XIP editor may resurrect the XIP by changing its status back to `Draft` or its earlier status. If not resurrected, an XIP can stay in this status permanently.

- **Withdrawn**: An XIP author can withdraw their XIP by setting its status to `Withdrawn`. This state is permanent. No one can resurrect the XIP using the same XIP number. If someone wants to pursue the XIP again, they must create a new proposal with a new XIP number.

## XIP header preamble

Each XIP must begin with an RFC 822-style header preamble, preceded and followed by three hyphens (`---`), as shown in the [XIP template](../xip-template.md).

For headers that permit lists of items, separate items with commas.

For headers that require dates, use the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format `YYYY-MM-DD`. For example: `2024-02-29`.

Headers must appear in the following order in the preamble:

| Header      | Description  |
|-------------|--------------|
| xip         | An XIP editor will assign the XIP number. An XIP author should not provide this value. |
| title       | Provide a short descriptive title for the XIP, limited to 44 characters. It should not include the XIP number. |
| description | Provide a description of the XIP, limited to 140 characters. It should not include the XIP number.|
| author      | List the XIP author names and their email addresses, GitHub usernames, or ENS domains. For more requirements, see [author details](#author-details). |
| discussions-to | While the XIP is in `Draft` status, provide a **discussions-to** header and set the value to the URL where the XIP is being discussed. The preferred URL is a topic in the [XIP Drafts](https://community.xmtp.org/c/xips/xip-drafts/53) discussion forum. The URL must not point to a GitHub pull request, an ephemeral URL, or a lockable URL, such as a Reddit topic. |
| status | Provide the XIP status: `Draft`, `Review`, `Last call`, `Final`, `Stagnant`, `Withdrawn`, or `Living`. To learn more, see [Start the XIP process](#start-the-xip-process). |
| last-call-deadline | While the XIP is in `Last call` status, provide a **last-call-deadline** header and set the value to the date the last call review period ends in `YYYY-MM-DD` format. |
| type | Provide the XIP type: `Standards`, `Process`, or `Informational`. To learn more, see [XIP types](#xip-types). |
| category | If it is a `Standards` XIP, provide the XIP category: `Core`, `Network`, `Interface`, `Storage`, or `XRC`. To learn more, see [XIP types](#xip-types). |
| created | Provide the date an XIP editor assigned a number to the XIP, in `YYYY-MM-DD` format. |
| replaced | If the XIP replaces an XIP, provide the **replaced** header and set its value to a link to the XIP it replaces. |
| required | If the XIP depends on an XIP, provide the **required** header and set its value to a link to the XIP it depends on. |
| superseded-by | If the XIP is superseded by an XIP, provide the **superseded-by** header and set its value to a link to the XIP that supersedes it. |
| updated | If the XIP is in `Living` status and has been updated after its **created** date, provide the **updated** header and set its value to the date the XIP was last updated in `YYYY-MM-DD` format. |
| withdrawal-reason | If the XIP is in `Withdrawn` status, provide the **withdrawal-reason** header and set its value to a sentence that explains why the XIP was withdrawn. |
| implementation | If the XIP has been implemented, provide the **implementation** header and set its value to the URL of the documentation that describes the actual implementation. This allows the XIP to serve as a historical record of the original proposal while directing people to current implementation details. |

### author details

For the **author** header, to include an email address, GitHub username, or ENS domain along with the author name, use one of these formats:

- Alix A. User &lt;alixauser@example.com&gt;

- Bo B. User (@bobusername)

- Caro C. User (carocuser.eth)

Do not use more than one of the following contact methods with a single author name: email address, GitHub username, or ENS domain.

If it is important to include more than one method, list the author's name twice, once with the email and once with the GitHub username, for example.

Authors who prefer anonymity may use only a GitHub username or a first name and GitHub username.

At least one author must use a GitHub username to enable notifications and approvals for change requests.

## XIP numbers and XIP links

When referring to an XIP by number, write it in hyphenated form `XIP-N`, where `N` is the XIP's assigned number.

An XIP referenced in an XIP must link to the XIP upon its first reference. Subsequent references may include the link.

Links to XIPs must use relative paths to enable links to work in this GitHub repository, forks of this repository, the main XIPs site, mirrors of the main XIP site, and so forth. For example, when referencing this XIP in an XIP, use a relative link like this: `[XIP-0](./xip-0-purpose-process.md)`.

## Auxiliary files

Images, diagrams, and auxiliary files should be included in the `../assets` folder subdirectory as follows: `../assets/xip-n`, where `n` is to be replaced with the XIP number. When linking to a file in the XIP, use relative links such as `../assets/xip-0/image.png`.

## Transferring XIP ownership

Occasionally, transferring ownership of XIPs to a new champion is necessary.

A good reason to transfer ownership is that the original author no longer has the time or interest to update the XIP or follow through with the XIP process. It may also be that the author has fallen off the face of the ‘net (i.e., is unreachable or isn’t responding to email).

A bad reason to transfer ownership is because of a disagreement with the direction the XIP has taken. The process is designed to build consensus around an XIP, but if that’s not possible, submitting a competing XIP is always an option.

To assume ownership of an XIP, send a message to the original author and the XIP editor asking to take it over. If the original author doesn’t respond to the email in a timely manner, the XIP editor will make a unilateral decision.

Retaining the original author as a co-author of the transferred XIP is ideal, but that’s up to the original author.

## XIP editors and responsibilities

The current XIP editors are:

- Matt Galligan (@galligan)
- Saul Carlin (@saulmc)
- Jennifer Hasegawa (@jhaaaa)

The editors don't pass judgment on XIPs. They merely perform administrative and editorial tasks.

For each new XIP proposal submitted as a pull request, an editor does the following:

- Reads the XIP to check if it is sound and complete. The proposal must make technical sense.

- Ensures that the title accurately describes the content.

- Checks the XIP for correct spelling, grammar, sentence structure, markup (GitHub-flavored Markdown), and code style.

- Provides specific feedback to the XIP author to help them prepare their XIP for review.

To learn more about XIP editor tasks, see [Start the XIP process](#start-the-xip-process).

Many XIPs are written and maintained by developers with write access to the **xmtp** GitHub organization codebase. The XIP editors monitor XIP changes and may regularly correct any structural, grammatical, spelling, and markup mistakes.

## History

This document was derived heavily from [Ethereum's EIP-1](https://eips.ethereum.org/EIPS/eip-1), which was derived from [Bitcoin's BIP-0001](https://github.com/bitcoin/bips) written by Amir Taaki, which in turn was derived from [Python's PEP-0001](https://www.python.org/dev/peps/). In many places, text was simply copied and modified. Although the PEP-0001 text was written by Barry Warsaw, Jeremy Hylton, and David Goodger, they are not responsible for its use in the XMTP Improvement Process and should not be bothered with technical questions specific to XMTP or the XIP. Please direct all comments to the XIP editors.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
