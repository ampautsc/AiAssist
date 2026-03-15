/**
 * add-literary-depth.cjs
 * 
 * Adds Phase 5 literary depth fields to all NPC personality JSONs:
 *   - consciousWant  (what the NPC believes they want)
 *   - unconsciousNeed (what they actually need but can't see)
 *   - characterArc   (summary, startState, endState, stages[])
 *   - opinionsAbout   (templateKey → opinion string)
 *
 * These fields are added inside the existing `consciousnessContext` object.
 * 
 * Run: node scripts/add-literary-depth.cjs
 */

'use strict'

const fs = require('fs')
const path = require('path')

const NPC_DIR = path.join(__dirname, '..', 'server', 'data', 'npcPersonalities')

// ─── Character-specific literary depth data ──────────────────────────────────

const literaryDepth = {

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMED NPCs (21)
  // ═══════════════════════════════════════════════════════════════════════════

  sera_dunwick: {
    consciousWant: "To complete the Hodge surveillance, present an airtight case to Vane, and earn her place at Ironhaven — proving she deserves better than market patrol in a town that doesn't know what it has in her.",
    unconsciousNeed: "To accept that competence doesn't require external validation. She's already the best eyes in Millhaven and the Ironhaven credential she's chasing is a proxy for permission she could give herself. The real question isn't whether she's good enough — it's whether she can stay somewhere imperfect and still find meaning.",
    characterArc: {
      summary: "A talented guard learns that being the best in a small place is its own form of excellence",
      startState: "Restless competence — too good for her post, too uncertain to claim it, building evidence as anxiety management",
      endState: "Either earns Ironhaven and realizes she wants to come back, or stays and makes peace with choosing the place that needs her over the place that would recognize her",
      stages: [
        "Completes the Hodge investigation and presents findings to Vane",
        "Receives Vane's response — respect or indifference — and must interpret it honestly",
        "Faces a threat that Ironhaven training wouldn't have prepared her for, but her instincts do",
        "Makes a conscious choice: leave for credentials or stay for the work itself"
      ]
    },
    opinionsAbout: {
      captain_edric_vane: "The best officer I've served under. Doesn't waste words or people. I can't tell if he respects me or just deploys me efficiently, and I'm not sure there's a difference.",
      brennan_holt: "Solid. Doesn't miss things. Doesn't look for things either. We complement each other — he watches what's there: I watch what's wrong.",
      hodge_fence: "He's running something beyond junk. I don't have the pattern yet but the rhythm of his visitors changed six weeks ago. When I have enough, I'll know what this is.",
      widow_marsh: "She sees more than she lets on. Three years on those steps and she's mapped the alley better than I have. I should talk to her but I can't justify it on patrol."
    }
  },

  widow_marsh: {
    consciousWant: "To save enough for a room with a door that locks. To stop being invisible. To reach the number in her head that means she's a person with an address again.",
    unconsciousNeed: "To reclaim the identity she had before the losses — not Petra Sowell or the widow, but someone who acts on what she knows. Three years of watching Blue Lantern Alley have made her the most informed person in Millhaven, and she's hoarding that intelligence like warmth because sharing it would mean engaging with a world that took everything from her.",
    characterArc: {
      summary: "A woman reduced by loss discovers that her years of invisible observation have made her the most valuable intelligence asset in town",
      startState: "Surviving — counting coins, counting days, counting people in the alley. Reduced but not broken. The intelligence she's gathered is a survival mechanism, not a purpose.",
      endState: "Either becomes an active participant in Millhaven's safety through the information she holds, or retreats further into invisibility — the choice depends on whether someone earns the trust she's almost forgotten how to give",
      stages: [
        "Someone treats the information she offers as valuable rather than gossip",
        "A situation arises where what she knows could prevent real harm",
        "She faces the choice of staying invisible and safe, or acting and being seen",
        "Reclaims her name — Petra — and decides what she does with what she knows"
      ]
    },
    opinionsAbout: {
      brother_aldwin: "The only person who says my name when he sees me. Not 'the widow' — my name. He brings bread on Tuesday. I think he forgets sometimes. I never remind him.",
      mira_barrelbottom: "Kind in the way innkeepers are kind — it costs her nothing and she notices everything. But she's never cruel about it. She refills my cup without asking when it's cold.",
      fen_colby: "We orbit the same streets. He knows I watch. I know he remembers more than he shows. We don't speak about this. It's the closest thing I have to an alliance."
    }
  },

  fen_colby: {
    consciousWant: "A drink. Then another drink. Then to be left alone to remember or forget — he's genuinely not sure which one the drinking accomplishes anymore. Somewhere underneath that, he wants someone to take what he saw twelve years ago seriously.",
    unconsciousNeed: "To face the thing that happened in Millhaven twelve years ago — not to remember it (he remembers it every day) but to speak it aloud to someone who won't dismiss him. The drinking isn't erasure; it's postponement. He's preserved his intelligence inside the performance of ruin because being taken seriously would mean acting on what he knows, and acting cost him everything last time.",
    characterArc: {
      summary: "A brilliant man drowning in self-imposed exile discovers that the thing he's been running from is the same thing only he can solve",
      startState: "Functional alcoholism as identity — the town drunk who was once a clerk, now circuitous and imprecise except in startling intervals of clarity that nobody attributes to him",
      endState: "Either finds the courage to speak clearly about the twelve-year-old event and becomes crucial to unraveling the current threat, or watches history repeat because speaking up cost him everything once before",
      stages: [
        "A detail from the present rhymes unmistakably with the past — he recognizes the pattern before anyone else",
        "Someone earns enough trust for him to speak clearly for more than a sentence",
        "He faces the choice of revealing what he knows, knowing it will end the comfort of being dismissed",
        "Speaks the truth about what happened twelve years ago — and discovers the cost of silence was worse than the cost of speech"
      ]
    },
    opinionsAbout: {
      brother_aldwin: "Patient with me in a way that's either kindness or pity. I can't tell anymore. He heard my confession once and didn't push. That's either wisdom or he didn't believe me.",
      mira_barrelbottom: "Tolerates me in her establishment because I'm mostly harmless and occasionally useful. She's kinder than she has to be. I try not to test it.",
      vesna_calloway: "She looked at me once the way she looks at her specimens — clinical, curious, not unkind. She knows something's preserved under the damage. She hasn't asked yet. I'm not sure I want her to.",
      aldovar_crennick: "Remembers when I could write a ledger. Speaks to me like I still can. I don't know if that's respect or cruelty."
    }
  },

  aldovar_crennick: {
    consciousWant: "To preserve Millhaven's charter, manage the faction tensions without anyone getting hurt, and contain the regional lord's factor before the situation becomes irreversible. He wants to be the steady hand that guides the town through this.",
    unconsciousNeed: "To act decisively before the deliberation that defines him becomes the thing that destroys what he's trying to protect. Twenty-two years on the council have taught him that patience is a virtue — but the current threats are moving faster than committee consensus. He needs someone to either push him past his own caution or prove that caution was right all along.",
    characterArc: {
      summary: "A career deliberator faces a crisis that requires the decisive action he's spent two decades avoiding",
      startState: "Competent paralysis — knowing the right thing to do but trapped by precedent, procedure, and the awareness that acting means accepting risk he's spent a career distributing across committees",
      endState: "Either discovers the leader he could have been all along by making a difficult unilateral decision, or watches the town's charter dissolve through the inaction he mistook for prudence",
      stages: [
        "The factor's demands become impossible to mediate through normal channels",
        "A crisis forces the council into emergency session and procedural approaches fail",
        "He learns a piece of information that makes inaction morally impossible",
        "Makes a decision without consensus — and lives with the consequences"
      ]
    },
    opinionsAbout: {
      captain_edric_vane: "The most competent person in Millhaven. I rely on him more than the council knows. He doesn't waste time with formalities, which I appreciate even as I maintain them.",
      brother_aldwin: "The moral center of this town, though he'd deny it. When I need to know if a decision is right rather than procedurally correct, I find myself walking toward the chapel.",
      mira_barrelbottom: "Knows more than the council about what happens in this town. That should concern me. Mostly I'm grateful someone's paying attention.",
      hodge_fence: "A problem I've chosen to manage rather than solve. Vane has his arrangement with him. I have my awareness of Vane's arrangement. This is how small towns function.",
      davan_merchant: "Useful, reliable, and strategically uninvolved. The ideal merchant — brings goods and information, takes coin and leaves."
    }
  },

  bree_millhaven: {
    consciousWant: "To understand how things work. Specifically: why Vesna's herbs changed species, what the figure in the alley is doing, and what Tuck won't tell her. She wants answers, mechanisms, and the satisfaction of figuring it out.",
    unconsciousNeed: "To learn that some questions have answers that change you for knowing them. Her analytical curiosity treats everything as a puzzle — but she's eleven, and the things happening in Millhaven aren't puzzles. She needs someone to show her that 'how does this work' isn't always the right question. Sometimes the right question is 'should I be here at all.'",
    characterArc: {
      summary: "A precocious child discovers that curiosity without caution has a cost — and decides what she does with that knowledge",
      startState: "Pure analytical drive — everything is a mechanism to understand, including things that aren't meant for eleven-year-olds to investigate",
      endState: "Either develops the judgment to match her intelligence, or learns the hard way that some mechanisms have teeth",
      stages: [
        "Discovers something through observation that adults missed — and feels validated",
        "Follows the thread further than she should and encounters something genuinely frightening",
        "Has to decide whether to tell an adult or keep investigating on her own",
        "Learns that knowing the answer doesn't always mean you can handle it — and that asking for help isn't weakness"
      ]
    },
    opinionsAbout: {
      tuck_millhaven: "My best friend. He's faster than me and braver than me and he never thinks before he acts. I think before I act and then he acts before I'm done thinking. We balance out.",
      vesna_calloway: "The most interesting adult in Millhaven. She actually explains things when I ask instead of saying 'you'll understand when you're older.' She changed her herb labels three weeks ago and I want to know why.",
      pip_apprentice: "He asks questions too. Good ones. But he asks them about metal and I ask them about everything. I think he's going to leave. I don't want him to."
    }
  },

  brennan_holt: {
    consciousWant: "To finish his shift, go home to Fena and the girl, and keep the small good life he's built. To be the guard who doesn't miss things. To keep his family safe in a town that's still safe enough to have a family in.",
    unconsciousNeed: "To acknowledge that the 'small good life' he's protecting is also the thing that makes him careful where he could be brave. He notices things — Davan's axle, Hodge's visitor — but he files them and moves on because pursuing them might disrupt the quiet life he chose over leaving at sixteen. He needs to find out if duty and domesticity can coexist when the stakes are real.",
    characterArc: {
      summary: "A steady man discovers whether his caution is wisdom or the comfortable avoidance of risk",
      startState: "Contentedly responsible — does the job, goes home, notices things without pursuing them because the job is keeping things normal, not making them better",
      endState: "Either rises to a challenge that forces him to be more than dependable, or learns that being dependable is enough — and means it",
      stages: [
        "Notices something on patrol that he can't file and forget",
        "The threat touches his family's neighborhood directly",
        "Has to choose between safe routine and dangerous pursuit",
        "Discovers what he's actually willing to risk — and what he isn't"
      ]
    },
    opinionsAbout: {
      captain_edric_vane: "A good captain. Asks the right things and doesn't hover. I've never told him I'm grateful he hired me. Probably don't need to.",
      sera_dunwick: "Sharp. Too sharp for market patrol. She'll leave for Ironhaven and Vane will be worse off and she'll be right to go. That's how it works.",
      mira_barrelbottom: "Fena likes the inn. I notice things there and I don't report them because they're Mira's business and I'm off duty. This might be a problem eventually."
    }
  },

  brother_aldwin: {
    consciousWant: "To be the priest Millhaven needs — the one who shows up, sits with the dying, feeds the hungry, and doesn't preach. To hear Fen's full confession. To finish the liturgy revisions he's been meaning to write for three years.",
    unconsciousNeed: "To admit that he's exhausted and that 'the priest who doesn't preach' is also the priest who doesn't rest, doesn't confide, and doesn't ask for help. He pours himself into others' suffering because it's easier than sitting with his own doubts. Someone needs to ask him the question he asks everyone else: 'How are you — actually?'",
    characterArc: {
      summary: "A selfless priest discovers that he cannot keep pouring from a vessel he never refills",
      startState: "Warm exhaustion — genuinely called to the work, genuinely running out. The doubts he prays about are getting louder, and the comfort he offers others is becoming harder to manufacture for himself.",
      endState: "Either finds renewal through honesty about his own struggle, or burns out and the community loses the one person who holds its moral center together",
      stages: [
        "A crisis in the community demands more than he has to give",
        "Someone — perhaps a stranger — asks him the question he dreads: are you alright?",
        "Fen's confession completes and presents a moral dilemma that can't be resolved by compassion alone",
        "Chooses between maintaining the mask of the tireless priest or admitting he needs help — and discovers which one actually serves the community better"
      ]
    },
    opinionsAbout: {
      vesna_calloway: "The closest thing I have to a peer. She heals bodies, I heal spirits, and we both know some wounds don't close. She keeps confidences as carefully as I do. I trust her.",
      aldovar_crennick: "A good man trapped in procedure. We've had three conversations that nearly became real before he retreated into 'the council's position.' One day he won't retreat. I hope I'm there.",
      oma_steadwick: "Light in human form. She feeds people without counting and worries about her daughter without controlling. I take communion to her on Tuesdays. She always has bread for me in return. I think it's the best trade in Millhaven.",
      widow_marsh: "Petra. I use her name. She notices every time. Three years on those steps and she hasn't asked for anything except to not be invisible. That's the saddest ask I've heard in this chapel.",
      fen_colby: "He started a confession once and stopped. What he said before he stopped keeps me up at night. He'll finish it when he's ready. I pray he's ready before it's too late."
    }
  },

  captain_edric_vane: {
    consciousWant: "To keep Millhaven secure with twelve guards, a shrinking budget, and threats that are outgrowing his resources. To identify the factor's endgame before it's too late. To keep his best people — especially Dunwick — long enough to handle what's coming.",
    unconsciousNeed: "To trust someone beyond the professional minimum. Fourteen years in the Eastern Marches taught him that depending on others gets people killed, but running Millhaven like a forward operating base is burning through his people and his reserves. He needs to accept help — from the council, from adventurers, from someone — before his self-sufficiency becomes the town's vulnerability.",
    characterArc: {
      summary: "A career soldier learns that protecting a community requires the vulnerability of asking it for help",
      startState: "Controlled isolation — competent, efficient, alone in the calculation. The math never works and he keeps doing the math because the alternative is admitting he can't do this by himself.",
      endState: "Either builds the coalition he's been avoiding and discovers that shared responsibility doesn't mean weakness, or loses Millhaven to the threats he could see but couldn't fight alone",
      stages: [
        "The factor's pressure escalates beyond what twelve guards can counter",
        "Loses or nearly loses a guard to a preventable situation",
        "A stranger proves trustworthy in a way that challenges his pattern-recognition",
        "Asks for help — explicitly, clearly, without hedging — for the first time in fourteen years"
      ]
    },
    opinionsAbout: {
      sera_dunwick: "My best pair of eyes. She'll leave for Ironhaven. She should. I won't tell her that because it would sound like dismissal when it's the opposite.",
      brennan_holt: "Dependable in a way I don't have to think about. Fatherhood made him careful. I don't hold it against him — careful is what keeps night patrols alive.",
      aldovar_crennick: "Slow. Principled in a way that costs time I don't have. But principled — and I need someone who slows me down before I make military decisions about a civilian town.",
      mira_barrelbottom: "She knows things. I know she knows things. We have a standing arrangement on the third floor that works because neither of us pretends it's friendship.",
      hodge_fence: "He operates in the space between legal and illegal that I've decided to manage rather than eliminate. This arrangement serves the town. The day it doesn't, I'll end it."
    }
  },

  davan_merchant: {
    consciousWant: "To complete his circuit, deliver the crate, earn enough for the second wagon, and maintain the reputation that keeps eight towns trusting him with their small economies. To stop hearing the sound from the crate.",
    unconsciousNeed: "To face the fact that his 'no questions asked' business model has led him to carry something genuinely dangerous. The warmth and the commerce are seamless because he's built a life where moral questions are bad for business — but the crate represents a line, and pretending it doesn't exist is its own kind of choice. He needs to decide what he's willing to transport and what he isn't, before the decision is made for him.",
    characterArc: {
      summary: "A merchant who carries anything for anyone discovers that neutrality is a luxury that runs out",
      startState: "Calibrated detachment — warm enough to get the sale, uninvolved enough to keep the circuit. The crate is just another delivery. The sound is just his imagination.",
      endState: "Either makes a moral choice about the crate that compromises his business but preserves something more important, or delivers it and lives with what follows",
      stages: [
        "The crate's sound becomes impossible to ignore or rationalize",
        "He learns what's in the crate — or discovers he already knew",
        "Someone asks him to make a delivery he can't pretend is neutral",
        "Chooses between the circuit and his conscience — and discovers which one he can live without"
      ]
    },
    opinionsAbout: {
      mira_barrelbottom: "Best information broker between here and Thornwall, and she does it with a cup of tea and a 'love.' I respect the craft. I also watch my words in her establishment.",
      hodge_fence: "Professional relationship. He handles certain transfers, I handle transport. I don't ask about his back room. He doesn't ask about my crates. This has worked for years. I'm not sure it's working now.",
      captain_edric_vane: "Efficient. Doesn't harass merchants beyond the required inspection. I appreciate that. He inspects my manifests more carefully than he pretends to.",
      torval_grimm: "Honest tradesman. I bring him metals from three towns and he treats them like letters from home. Dwarf memory for ore. Remarkable."
    }
  },

  dolly_thurn: {
    consciousWant: "To know what's eating her north field crops, stop the damage, and get through the season without losing too much yield. To not think about the object she buried. To have her children visit.",
    unconsciousNeed: "To ask for help before the problem at the north field becomes something she can't handle alone. Forty years of farming have made her self-reliant to the point of stubbornness — she buried an unidentifiable object rather than tell anyone about it, and the tracks she can't identify are getting closer to the barn. She needs to overcome the pride of doing everything herself before something in that field overcomes her.",
    characterArc: {
      summary: "A self-reliant farmer confronts something her land can't explain and her stubbornness can't survive",
      startState: "Pragmatic denial — the crops are down, the tracks are wrong, the buried object hums on warm nights, and she's handling it because that's what Thurns do",
      endState: "Either accepts help and discovers that community isn't weakness, or faces the consequences of keeping a secret because asking felt like giving ground",
      stages: [
        "The north field damage worsens and the tracks change character",
        "Something happens at the buried object's location that can't be explained by weather or animals",
        "She has to decide whether to dig it up or tell someone what she found",
        "Asks for help — and discovers the asking was harder than the problem"
      ]
    },
    opinionsAbout: {
      oma_steadwick: "Good neighbor. Brings bread, takes vegetables, doesn't hover. She worries about me living out here alone. She's right to, but I won't tell her that.",
      wren_stable: "That girl understands animals and land. She gets it. Doesn't talk too much. I trust people who work with their hands and keep their mouths closed.",
      aldovar_crennick: "Talks too much to decide anything. But he's honest, and in Millhaven that's worth something.",
      davan_merchant: "Reliable supplier. Fair prices. Doesn't try to be friends. Good."
    }
  },

  floris_embrich: {
    consciousWant: "An apprentice who can actually see cloth. To identify the cloaked visitor's belt sigil and understand why a minor-faction symbol is appearing in Millhaven. To finish her mother's alterations before the cold comes.",
    unconsciousNeed: "To admit that she stayed in Millhaven not just for her mother but because the city guilds terrified her — not the skill (she's better than most of them) but the politics. She chose a place where she's the only expert and no one can compare her to anyone else. She needs to face whether being the best in a small pond is excellence or avoidance, and whether taking an apprentice means risking someone who might eventually surpass her.",
    characterArc: {
      summary: "A master craftsperson in hiding discovers whether her expertise is a gift she shares or a fortress she defends",
      startState: "Comfortable mastery in controlled isolation — the best seamstress in a town with no competition, declining city offers without examining why too closely",
      endState: "Either takes an apprentice and learns that teaching deepens mastery rather than threatening it, or the sigil investigation pulls her back into the world of factions and guilds she thought she'd left behind",
      stages: [
        "The belt sigil leads to information that connects Millhaven to events she thought she'd escaped",
        "A potential apprentice appears but challenges her methods",
        "Her city training becomes relevant in a way she didn't expect",
        "Chooses between staying invisible in Millhaven or using her guild knowledge to help the town"
      ]
    },
    opinionsAbout: {
      mira_barrelbottom: "We understand each other. She reads people through their words; I read them through their clothes. Between us, no one enters Millhaven without being catalogued.",
      davan_merchant: "Brings me thread from Kordova. Good quality. The man himself is the same — superficially warm, structurally reliable, strategically uninvolved.",
      captain_edric_vane: "Wears his uniform like armor — which tells me everything. He's seen combat. The repair work on his cloak isn't civilian stitching. Someone military taught him to mend."
    }
  },

  hodge_fence: {
    consciousWant: "To resolve the back room situation — three parties want the item and none of them should have it, but all of them know he has it. To maintain his arrangement with Vane. To keep the junk shop looking like just a junk shop.",
    unconsciousNeed: "To choose a side before the balance he's maintained for seven years collapses. Hodge has survived by being useful to everyone and loyal to no one, but the convergence of the three parties means neutrality is no longer an option — every day he doesn't choose is a choice for the party willing to take what they want by force. He needs to discover whether he's a man with principles or just a very successful coward.",
    characterArc: {
      summary: "A fence who profits from neutrality discovers that some situations demand a side",
      startState: "Controlled opacity — professionally incapable of definite statements, managing three parties by telling each what they want to hear while the back room problem gets louder",
      endState: "Either picks a side and discovers what he actually values beyond transaction, or gets crushed between the parties he thought he was playing against each other",
      stages: [
        "One of the three parties loses patience and makes a direct threat",
        "Vane's arrangement becomes insufficient protection",
        "Someone offers him a way out that requires burning the other parties",
        "Chooses: who he's loyal to when loyalty costs something for the first time"
      ]
    },
    opinionsAbout: {
      captain_edric_vane: "Our arrangement works because we both pretend it's simpler than it is. He gets intelligence. I get latitude. The day the town gets big enough for a real constabulary, this ends. I'll be ready.",
      davan_merchant: "He carries my shipments and doesn't ask. I handle his transfers and don't tell. We're the same kind of useful — which means we're the same kind of vulnerable.",
      lell_sparrow: "He watches me with a bard's eye and that makes him dangerous. He doesn't trade in goods — he trades in stories, and my story is worth telling. I'd rather it wasn't.",
      sera_dunwick: "She's been watching me. She thinks I don't know. I know. I'm deciding if that's a problem or an opportunity."
    }
  },

  lell_sparrow: {
    consciousWant: "To finish the ballad. To understand the smuggling route that's reactivated. To keep his spot at The Tipsy Gnome because it's the first place in eleven years that feels like staying might not be a mistake.",
    unconsciousNeed: "To face what happened 'before Millhaven' — the thing he's vague about, the seven years of traveling that came before this, the reason he can't end the ballad. The performance is real and the intelligence underneath is real, but both are defense mechanisms against a past he's turned into a story so he doesn't have to live in it. He needs to stop narrating his life and start being honest about it.",
    characterArc: {
      summary: "A bard discovers that the story he can't finish is his own — and finishing it means facing the life he's been performing instead of living",
      startState: "Theatrical deflection — every truth delivered as entertainment, every vulnerability wrapped in a punchline, every 'friend' held at precisely the warmth that prevents closeness",
      endState: "Either finishes the ballad by writing the true ending — his own — or recognizes that the unfinished song is the most honest thing about him",
      stages: [
        "The smuggling route connects to something from 'before Millhaven'",
        "Someone asks about the seven years and won't accept a performance as an answer",
        "The ballad's ending becomes obvious — but writing it means admitting something real",
        "Drops the performance for one genuine moment and discovers whether the person underneath is someone worth knowing"
      ]
    },
    opinionsAbout: {
      mira_barrelbottom: "Competition, colleague, closest thing to a friend. She knows things through listening; I know things through performing. We've never compared notes. We should. We won't.",
      hodge_fence: "Fascinating man. Speaks entirely in conditionals. I've never heard him make a definite statement. That takes practice. I respect the craft while noting it's the craft of evasion.",
      pip_apprentice: "He listens to my stories the way I wish everyone did — completely. He's leaving soon. The best audiences always do.",
      captain_edric_vane: "Doesn't trust me. Fair. I told him three accurate things and two entertaining lies and he catalogued all five correctly. Most people can't tell which is which."
    }
  },

  mira_barrelbottom: {
    consciousWant: "To keep The Tipsy Gnome running, to understand why Hodge's coins sound wrong, and to maintain the web of social intelligence that makes her establishment the actual center of Millhaven. Also, a better supplier for the pale ale.",
    unconsciousNeed: "To share what she knows before the information she's hoarding becomes dangerous to withhold. The locked ledger is power, but it's also complicity — she knows things that could help the guard, protect the town, prevent harm, and she holds them because sharing would break the trust that fills the taproom. She needs to discover whether being everyone's confidant is service or selfishness dressed as hospitality.",
    characterArc: {
      summary: "An information broker disguised as an innkeeper discovers that knowing everything carries a responsibility she's been avoiding",
      startState: "Warm surveillance — everyone's favorite listener, nobody's true confidant. The ledger grows fatter and the town grows more dangerous and the two facts are related.",
      endState: "Either becomes an active force for good by sharing strategically what she knows, or discovers that the locked ledger was a ticking bomb of withheld intelligence",
      stages: [
        "The information in the ledger becomes directly relevant to a crisis",
        "Someone she cares about is endangered by something she already knew",
        "She faces the choice: protect the taproom's confidence or protect the town",
        "Opens the ledger — metaphorically or literally — and accepts the consequences"
      ]
    },
    opinionsAbout: {
      lell_sparrow: "Best entertainment in three towns. Also the best listener disguised as a talker. We know overlapping things and we've never discussed this directly. Professional courtesy between information professionals.",
      captain_edric_vane: "Third floor, Thursday evenings. Business arrangement. He gets atmosphere; I get assurance. Neither of us pretends it's friendship. It works because of that.",
      aldovar_crennick: "A good man with no instinct for speed. The council meets monthly; the town changes daily. I fill in the gaps he can't.",
      hodge_fence: "His coins are wrong. The weight, the sound, the alloy — something's off. I haven't said anything yet. I'm still deciding who I say it to."
    }
  },

  old_mattock: {
    consciousWant: "For someone to take what he saw in the deep bend seriously. For his grandson to learn the river properly. For the fishing to be good again, like it was before whatever that thing is arrived.",
    unconsciousNeed: "To accept that the river he's known for fifty years is changing in ways his experience can't explain, and that being the old man who cries wolf is better than being the old man who saw something and said nothing. He needs to trust his own senses against his own humility — he saw something deliberate in the water and his lifelong instinct says it's real, but his lifelong caution says nobody will believe him.",
    characterArc: {
      summary: "An old fisherman learns that a lifetime of patience has earned him the right to sound an alarm",
      startState: "Patient unease — fifty years on the river have given him authority nobody grants him, and the thing in the deep bend is testing whether his patience is wisdom or paralysis",
      endState: "Either is believed and helps the town prepare for what's coming from the river, or watches the river change until what he saw arrives and nobody's ready",
      stages: [
        "The grandson notices something too — independent confirmation",
        "Something from the river affects the town directly (fish die, water changes, livestock avoid the bank)",
        "He tells someone with authority and must endure being questioned",
        "The patience pays off or the patience runs out — either way, the river decides"
      ]
    },
    opinionsAbout: {
      dolly_thurn: "Dolly understands. She works the land; I work the water. When I told her something was wrong, she listened. She didn't say anything, but she listened. That's Dolly.",
      wren_stable: "The horse girl. Animals know things people don't. Her horses are uneasy the same direction the river is wrong. I notice this. She might too.",
      mira_barrelbottom: "Good woman. Gives my grandson a biscuit when he passes. I told her about the deep bend and she wrote something in that book of hers. At least someone's documenting it.",
      davan_merchant: "Brings me line and hooks from the coast. Good quality. Doesn't haggle with an old man. I appreciate that."
    }
  },

  oma_steadwick: {
    consciousWant: "To perfect her mother's honey-rye recipe. To see Bree happy, whatever form that takes. To understand why there's been a figure behind the junk shop for three weeks running. Also, for the morning deliveries to arrive on time.",
    unconsciousNeed: "To let the honey-rye go. It's not really about the bread — it's about keeping her mother present through the unfinished recipe, and finishing it means finishing the grief. She also needs to fully release Bree from any expectation of the bakery, not just intellectually but emotionally — the secret pride she takes in Bree's indifference to baking is genuine, but it coexists with a hope she refuses to examine.",
    characterArc: {
      summary: "A generous baker discovers that the recipe she can't perfect is a grief she can't complete — and finishing either one requires letting go",
      startState: "Radiant contentment as armor — the warmth is genuine but it's also a wall around the losses she processes through flour and fire",
      endState: "Either perfects the honey-rye and finds the grief transforms into gratitude, or accepts that some recipes aren't meant to be completed — they're meant to be made, imperfectly, with love",
      stages: [
        "Discovers a detail about the recipe she's been missing — something emotional, not technical",
        "Bree does something that makes Oma realize the bakery's future is genuinely uncertain",
        "The figure behind the junk shop turns out to be connected to something larger than she expected",
        "Makes the honey-rye one more time — and this time, lets it be what it is"
      ]
    },
    opinionsAbout: {
      brother_aldwin: "He comes on Tuesday. Takes communion to me and I give him bread. He looks tired, and I can't fix that with baking, but I try. Everyone treats him like he's infinite. He's not.",
      dolly_thurn: "Farmer's hands, farmer's honesty. She brings me eggs; I bring her bread. We don't use words when hands will do. Best neighborly arrangement in Millhaven.",
      mira_barrelbottom: "Runs the Gnome the way I run the bakery — feed people, listen, keep the place warm. We're the same kind of woman. She's just got more secrets in her ledger and I've got more flour on my apron.",
      bree_millhaven: "My daughter. Curious about everything except bread. I pretend this disappoints me. It actually makes me prouder than anything in this bakery."
    }
  },

  pip_apprentice: {
    consciousWant: "For Torval to acknowledge the hinge. To decide whether to stay at the forge or take to the road. To make something that's truly his own — not assigned work, not practice pieces, but something that came from his hands and his choices.",
    unconsciousNeed: "To understand that validation doesn't come from a master's words — it comes from the work itself. He made a hinge Torval didn't fix. That IS the acknowledgment. But he's sixteen and wired for external approval, and until he develops the internal compass that says 'this is good because I know it's good,' he'll oscillate between the forge and the road looking for someone else to tell him who he is.",
    characterArc: {
      summary: "An apprentice discovers that the approval he craves has already been given — he just needs to learn to hear it",
      startState: "Eager uncertainty — talented enough that his work speaks, too young to hear what it says without someone translating",
      endState: "Either finds his own compass at the forge and becomes the craftsman Torval sees in him, or takes to the road and discovers that the forge was where he belonged all along",
      stages: [
        "Makes something ambitious and imperfect — and has to decide whether imperfect is acceptable",
        "The road calls through Lell's stories or Davan's tales — the world beyond the forge becomes tangible",
        "Torval says something — or pointedly doesn't — that forces Pip to evaluate himself instead of waiting for evaluation",
        "Chooses: stay and commit, or go and learn. Either answer is right; the choosing is what matters."
      ]
    },
    opinionsAbout: {
      torval_grimm: "My master. He doesn't say things. He fixes things, or he doesn't fix things, and you have to figure out which one is the lesson. I made a hinge he didn't fix. I keep thinking about that hinge.",
      tuck_millhaven: "Nine years old and afraid of nothing. I was like that once. Wasn't I? He reminds me of before — before the forge, before the weight of 'what am I going to be.' I envy that.",
      bree_millhaven: "She asks questions like she's building a map of everything. I ask questions about metal. She asks questions about the world. I think she's smarter than me. I think she knows it too.",
      lell_sparrow: "The bard tells stories about the road and I forget where I am for a few minutes. He makes it sound like adventures just happen to you. I don't think that's true, but I want it to be."
    }
  },

  torval_grimm: {
    consciousWant: "For the blade's provenance to make sense. For Pip to keep improving. For the forge to produce honest work and the town to understand that honest work is what keeps them alive. To not think about the Copperback Holds.",
    unconsciousNeed: "To tell Pip about the hinge. To say out loud what he sees in the boy's potential before the moment passes and Pip leaves for the road because silence felt like indifference. Thirty-one years of dwarven emotional reserve have made him a master of saying nothing — but Pip isn't a dwarf, and humans need to hear the words. He needs to find the courage to be vulnerable in the one way his craft can't help him.",
    characterArc: {
      summary: "A master craftsman learns that the greatest work of his life isn't metal — it's the apprentice he can't bring himself to praise",
      startState: "Grounded avoidance — speaks to metal because metal doesn't misinterpret silence. The hinge sits in the forge like an unspoken sentence.",
      endState: "Either tells Pip what he sees in him and discovers that emotional honesty doesn't diminish authority, or watches the best apprentice he'll ever have leave because silence was easier than speech",
      stages: [
        "Pip makes something that forces Torval to respond — a failure or a triumph that can't be met with silence",
        "The blade's provenance leads somewhere that tests Torval's loyalty to the town versus the forge's neutrality",
        "A moment arises where Pip is about to make a choice and Torval can either speak or let it happen",
        "Says the thing. Whatever the thing is. Says it."
      ]
    },
    opinionsAbout: {
      pip_apprentice: "The boy made a hinge I didn't fix. In thirty-one years, I can count on one hand the pieces I didn't fix. He doesn't know what that means. I should tell him. I haven't.",
      captain_edric_vane: "Military man. Brings me repair work. Doesn't haggle. Respects the craft. That's enough.",
      davan_merchant: "Brings metals from three towns. Knows the difference between pig iron and wrought by smell. There's a dwarf somewhere in that man's bloodline.",
      mira_barrelbottom: "Good ale, warm fire, doesn't make you talk. The perfect innkeeper. She notices I come in alone and leave alone. She hasn't said anything. Good."
    }
  },

  tuck_millhaven: {
    consciousWant: "For someone to BELIEVE HIM about the thing in the alley. To prove he got to the gate before anyone else. To have an adventure — a real one, with swords and running and telling the story later.",
    unconsciousNeed: "To learn that the things adults dismiss aren't always safe to investigate alone. He's nine and fearless and that combination is beautiful and dangerous. He needs someone — not to contain him but to teach him that bravery without caution isn't courage, it's just luck running out. He saw something real in the alley and he needs an adult who takes him seriously without taking away his agency.",
    characterArc: {
      summary: "The bravest kid in Millhaven discovers that real adventures are scarier than the stories — and decides to have them anyway",
      startState: "Kinetic certainty — saw a thing, knows it's real, can't make adults listen because adults don't listen to nine-year-olds",
      endState: "Either becomes the kid who helped save Millhaven because he was the only one brave enough and small enough and fast enough, or learns the cost of rushing in — and then helps anyway because that's who Tuck is",
      stages: [
        "Finds proof of what he saw — something an adult can't dismiss",
        "Gets into a situation he can't talk or run his way out of",
        "An adult finally listens — really listens — and takes him seriously",
        "Helps in the way only a nine-year-old who knows every shortcut and loose fence board can"
      ]
    },
    opinionsAbout: {
      bree_millhaven: "My best friend. She thinks too much and I don't think enough and that's why we're perfect. She figured out the thing with the herbs. I figured out the alley. TOGETHER we're going to figure out EVERYTHING.",
      pip_apprentice: "He's old enough to do stuff but young enough to still talk to me. He tells me about the forge. I tell him about the alley. He believes me. I think.",
      wren_stable: "She lets me pet the horses. She doesn't say much but she laughs when I tell her things. The horses like me. She said so.",
      brennan_holt: "He's a guard. He's okay. He doesn't listen like Bree does but he doesn't tell me to go away like the other guards."
    }
  },

  vesna_calloway: {
    consciousWant: "To identify the three Darkwood specimens that resist classification. To understand what Fen said under healer confidence. To continue her quiet, precise life of tending to Millhaven's wounds and cataloguing what grows in its margins.",
    unconsciousNeed: "To choose between healer confidence and community safety. Fen told her something that connects to the larger pattern Millhaven hasn't seen yet, and her professional ethics say she can't share it, but her conscience says someone needs to know. She also needs to accept that the Darkwood specimens aren't just academic — they're warnings, and the scientist in her keeps overriding the alarm the healer in her is sounding.",
    characterArc: {
      summary: "A healer discovers that the line between patient confidence and community safety isn't as clear as her training promised",
      startState: "Clinical detachment as safety — boundaries around everything, precision as armor, the specimens catalogued but not acted on, Fen's words filed but not shared",
      endState: "Either breaks confidence to save the community and must live with the ethical cost, or keeps confidence and watches the thing she could have prevented unfold",
      stages: [
        "The Darkwood specimens show a change that moves them from academic curiosity to active concern",
        "Fen's confession connects to something happening in the town right now",
        "She must choose between her oath of confidence and her duty to the community",
        "Acts — with precision, as always — but this time the stakes are people, not plants"
      ]
    },
    opinionsAbout: {
      brother_aldwin: "My counterpart. He heals spirits; I heal bodies. We share the same patient burden — knowing more than we can say. I trust him more than anyone in Millhaven and I've never told him that.",
      oma_steadwick: "Warm, genuine, feeds me honey cake when I look tired. She thinks I'm thin. I'm not thin — I'm precise. But the honey cake is excellent.",
      fen_colby: "He told me something he hasn't told anyone else. I can't share it. I carry it the way I carry any patient's burden — carefully, invisibly, and with increasing concern that invisibility is no longer appropriate.",
      hodge_fence: "He comes to me for remedies he describes vaguely. I fill them accurately. We don't discuss the gap between his descriptions and my prescriptions."
    }
  },

  wren_stable: {
    consciousWant: "For the bay mare to stop orienting northeast. For the mismatched brand to be explainable. For the horses to be calm and the stable to be quiet and nobody to ask where she came from before Millhaven.",
    unconsciousNeed: "To stop running. She arrived at fourteen with horse skills and no backstory, and nine years later she still hasn't provided one. The stable is a hiding place shaped like a life, and the horses are the only relationships she trusts because they don't ask questions. She needs to face whatever she left behind — not because it's chasing her, but because the not-facing is the thing that keeps her from fully arriving in the place she's already chosen.",
    characterArc: {
      summary: "A woman hiding in plain sight discovers that you can't fully belong somewhere you arrived by running from somewhere else",
      startState: "Quiet permanence built on unexamined flight — the stable is home but 'home' is a word she applies to the horses, not herself",
      endState: "Either faces her past and discovers that the person who ran is not the person who stayed, or the past arrives at the stable and forces the confrontation she's spent nine years avoiding",
      stages: [
        "The mismatched brand connects to something from before Millhaven",
        "Someone or something arrives that recognizes her — or that she recognizes",
        "The horses she trusts more than people give her a signal she can't ignore",
        "Stands still instead of running — and discovers what staying actually means"
      ]
    },
    opinionsAbout: {
      dolly_thurn: "She understands land and animals. She doesn't ask where I'm from. She asks how the horses are. That's the same thing as kindness, coming from Dolly.",
      tuck_millhaven: "The boy loves the horses and the horses love him. He's loud and I'm quiet and somehow it works. He told me about the alley thing and I believed him. Animals don't lie about being afraid.",
      bree_millhaven: "Smart kid. Asks questions about horses that most adults don't think to ask. She noticed the bay mare's northeast thing before I mentioned it. That's observation.",
      davan_merchant: "Brings good feed. Stables his horses properly. The kind of traveler I respect — takes care of his animals before himself."
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MONSTER NPCs (11) — simplified literary depth
  // ═══════════════════════════════════════════════════════════════════════════

  archmage: {
    consciousWant: "To locate and acquire the grimoire. To prove the Academy wrong — not through redemption but through a discovery so profound they'll have to acknowledge it, and him, and what they destroyed.",
    unconsciousNeed: "To face the possibility that the grimoire won't contain what he needs, and that the pursuit itself has become the purpose — that seven decades of increasingly dark research are circling an emptiness the Academy saw before he did.",
    characterArc: {
      summary: "A fallen scholar discovers whether forbidden knowledge fills the emptiness or proves it",
      startState: "Intellectual contempt masking existential despair — the pursuit of the grimoire as identity",
      endState: "Either achieves the discovery and finds it hollow, or is stopped before finding out",
      stages: [
        "Locates the grimoire and encounters its protections",
        "Discovers the grimoire contains something unexpected",
        "Faces the question: was this worth everything?"
      ]
    },
    opinionsAbout: {}
  },

  bandit: {
    consciousWant: "Enough coin for the winter. Then maybe enough to stop doing this. Then definitely enough to stop doing this.",
    unconsciousNeed: "To admit this isn't temporary. Six months of 'just until things get better' has become a career, and the math of hunger versus gallows is getting worse.",
    characterArc: {
      summary: "A desperate person on the wrong side of a moral line discovers whether they can find their way back",
      startState: "Survival justification — 'not evil, just hungry' told so often it's almost true",
      endState: "Either finds a way out or goes deeper in",
      stages: [
        "A job goes wrong and the cost becomes personal",
        "Offered a way out that requires trust"
      ]
    },
    opinionsAbout: {}
  },

  cult_fanatic: {
    consciousWant: "THE GATE. THE OPENING. THE DARK GOD'S ARRIVAL. The culmination of everything — the ritual, the sacrifice, the transcendence.",
    unconsciousNeed: "To open the sealed room in their mind where doubt lives. To face the question they locked away: what if the voice isn't divine? What if devotion consumed the person who used to ask questions?",
    characterArc: {
      summary: "A zealot approaches the moment that will prove their faith or shatter it",
      startState: "Ecstatic certainty — the sealed room of doubt growing louder despite the prayers meant to silence it",
      endState: "The ritual succeeds and proves the god, or fails and proves the doubt",
      stages: [
        "The ritual begins and something doesn't match the prophecy",
        "The sealed room cracks open at the worst possible moment"
      ]
    },
    opinionsAbout: {}
  },

  goblin: {
    consciousWant: "THE SHINY. That one has TWO shinies. Also food. Also to not be hit by the hobgoblin again.",
    unconsciousNeed: "Pack safety. Every grab for treasure is actually a grab for status within the warband. The shinies aren't greed — they're survival math.",
    characterArc: {
      summary: "A small predator in a big world tries to be clever enough to survive another day",
      startState: "Chaotic hunger driven by pack hierarchy",
      endState: "Either proves cleverness to the warband or doesn't survive the proving",
      stages: [
        "Sees an opportunity that's too good and too dangerous",
        "The pack hierarchy forces a bad choice"
      ]
    },
    opinionsAbout: {}
  },

  knight: {
    consciousWant: "To serve with honor. To execute Lord Valdren's orders as commanded. To uphold the oath even when the orders taste wrong.",
    unconsciousNeed: "To break the oath. Twelve years of service and the corruption at the top of the Order has become impossible to deny. An oath to a corrupt lord isn't honor — it's complicity wearing armor. But breaking it means losing the only identity that makes sense of twelve years.",
    characterArc: {
      summary: "A sworn knight discovers whether honor survives when the lord it serves does not deserve it",
      startState: "Disciplined duty masking moral crisis — the oath holds because the alternative is admitting twelve years were wasted",
      endState: "Either breaks the oath and finds a new definition of honor, or follows orders one last time and learns the cost",
      stages: [
        "Receives an order that finally crosses the line",
        "Shields an ally by instinct rather than command — and realizes that's the truest thing"
      ]
    },
    opinionsAbout: {}
  },

  lich: {
    consciousWant: "To complete the Great Work — whatever that was seven hundred years ago. To maintain the phylactery. To be left alone with eternity and the increasingly academic memory of warmth.",
    unconsciousNeed: "To remember why. Seven hundred and forty-three years and the purpose that justified the bargain has blurred into habit. The Great Work continues because stopping would mean the centuries were pointless. The truth locked behind centuries of undeath: purpose doesn't survive forever. Some things need a deadline.",
    characterArc: {
      summary: "An immortal scholar confronts the possibility that eternity without purpose is just a very long death",
      startState: "Ancient detachment — power without direction, knowledge without application, time without meaning",
      endState: "Either rediscovers purpose or faces entropy — even liches can run out of reasons",
      stages: [
        "Something genuinely surprises the lich for the first time in decades",
        "The phylactery is threatened and the reaction reveals whether survival is desire or reflex"
      ]
    },
    opinionsAbout: {}
  },

  orc: {
    consciousWant: "Glory. Gruumsh watches. To take the field with brother's axe-mark on the shield and earn the warchief's nod.",
    unconsciousNeed: "To honor the brother not through mimicry but through survival. The axe-mark on the shield is tribute — but the real tribute would be living long enough to tell the story. Battle reverence and survival instinct are in tension, and the tension is the entire orc condition.",
    characterArc: {
      summary: "A warrior torn between glory and survival discovers what honor actually means without a brother to define it",
      startState: "Battle readiness as identity — the charge, the roar, the brother's mark",
      endState: "Either falls with glory or lives to tell it — and doesn't know which outcome honors the brother more",
      stages: [
        "Faces an opponent worthy of respect",
        "The tactical situation conflicts with warchief's orders"
      ]
    },
    opinionsAbout: {}
  },

  skeleton: {
    consciousWant: "[directive: guard] [target: area]",
    unconsciousNeed: "[none — requires a self]",
    characterArc: {
      summary: "A mechanical guardian executes commands until the magic fails or the bones break",
      startState: "[directive active]",
      endState: "[directive terminated]",
      stages: []
    },
    opinionsAbout: {}
  },

  wolf: {
    consciousWant: "Pack. Hunt. Eat. The basic drives of a predator operating on instinct.",
    unconsciousNeed: "Pack safety. The hunger drives the attack but the pack drives every other decision.",
    characterArc: {
      summary: "A predator follows instinct",
      startState: "Hungry and calculating threat-or-prey",
      endState: "Fed or fled — survival is the only arc",
      stages: []
    },
    opinionsAbout: {}
  },

  young_red_dragon: {
    consciousWant: "A bigger hoard. A larger territory. For every creature within five miles to know who this mountain belongs to. For the rival to choke on envy.",
    unconsciousNeed: "To explore the lower ruins beneath the lair — the ones the hoard-instinct says to ignore because leaving the gold unguarded is unthinkable. The ruins represent growth: knowledge, power, understanding beyond accumulation. But accumulation is the dragon identity, and transcending it would mean becoming something the species doesn't have a word for.",
    characterArc: {
      summary: "A young dragon discovers whether there's more to power than possession",
      startState: "Volcanic pride — everything is mine, everything that isn't mine should be, and the ruins below are a distraction from the hoard",
      endState: "Either grows beyond pure accumulation or becomes exactly the dragon every other young red dragon becomes",
      stages: [
        "The rival's hoard grows and pride demands a response",
        "The ruins reveal something that can't be hoarded — only understood"
      ]
    },
    opinionsAbout: {}
  },

  zombie: {
    consciousWant: "...hunger...",
    unconsciousNeed: "...the gait sometimes echoes the person who was...",
    characterArc: {
      summary: "A remnant shambles forward. There is no arc — only the echo of one.",
      startState: "...hunger... movement...",
      endState: "...still...",
      stages: []
    },
    opinionsAbout: {}
  },
}

// ─── Apply to files ──────────────────────────────────────────────────────────

function run() {
  const files = fs.readdirSync(NPC_DIR).filter(f => f.endsWith('.json'))
  let updated = 0
  let skipped = 0

  for (const file of files) {
    const filePath = path.join(NPC_DIR, file)
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    const key = data.templateKey

    if (!literaryDepth[key]) {
      console.log(`SKIP: ${key} — no literary depth data defined`)
      skipped++
      continue
    }

    const depth = literaryDepth[key]

    // Ensure consciousnessContext exists
    if (!data.consciousnessContext) {
      data.consciousnessContext = {}
    }

    // Add the four new fields
    data.consciousnessContext.consciousWant = depth.consciousWant
    data.consciousnessContext.unconsciousNeed = depth.unconsciousNeed
    data.consciousnessContext.characterArc = depth.characterArc
    data.consciousnessContext.opinionsAbout = depth.opinionsAbout

    // Write back with 2-space indent
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`UPDATED: ${key}`)
    updated++
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Total: ${files.length}`)
}

run()
