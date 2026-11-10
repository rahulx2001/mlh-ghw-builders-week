import sys


def get_choice(prompt, options):
    while True:
        try:
            choice = input(prompt).strip()
        except EOFError:
            print("\nGoodbye!")
            sys.exit(0)

        if choice.isdigit() and 1 <= int(choice) <= len(options):
            return int(choice)

        print(f"Please enter a number from 1 to {len(options)}.")


def introduction():
    print("\n" + "=" * 60)
    print("                 LOST IN THE SERVER ROOM")
    print("=" * 60)
    print(
        "\nYou wake up in a dark server room with no memory of how you got there."
        "\nRed lights blink across towering racks, fans roar overhead, and a locked"
        "\ndoor stands at the far end of the room."
    )
    print("Your goal: find a way out before the backup generators fail.\n")


def security_checkpoint():
    print("\n--- Scene 1: The Security Checkpoint ---")
    print(
        "A monitor glows beside the entrance. It displays three possible access"
        " routes, but only one looks safe."
    )
    print("\n1. Search the security desk")
    print("2. Crawl beneath the server racks")
    print("3. Follow the emergency exit arrows")

    choice = get_choice("\nWhat do you do? ", ["desk", "racks", "arrows"])

    if choice == 1:
        print(
            "\nInside a drawer, you find a visitor badge and a handwritten note:"
            "\n'When the lights flash twice, use the blue key.'"
        )
        return True

    if choice == 2:
        print(
            "\nYou crawl beneath the racks and disturb a loose cable. Sparks fly,"
            "\nand an alarm begins screaming. Security drones rush toward you."
        )
        return False

    print(
        "\nThe arrows lead you to a maintenance corridor, but the floor suddenly"
        "\ngives way beneath you."
    )
    return False


def cooling_corridor():
    print("\n--- Scene 2: The Cooling Corridor ---")
    print(
        "The checkpoint door opens into a freezing corridor. A warning sign reads:"
        "\n'Cooling system unstable. Choose one route.'"
    )
    print("\n1. Enter the cold storage room")
    print("2. Cross the narrow catwalk")
    print("3. Shut down the cooling system")

    choice = get_choice("\nWhich route do you take? ", ["storage", "catwalk", "shutdown"])

    if choice == 1:
        print(
            "\nThe cold storage room seals behind you. You find a blue key frozen"
            "\ninside a block of ice and use a nearby heat lamp to free it."
        )
        return True

    if choice == 2:
        print(
            "\nThe catwalk shakes as the cooling fans surge. You grab the railing,"
            "\nbut a panel snaps loose and you fall into the darkness below."
        )
        return False

    print(
        "\nYou shut down the cooling system, but the servers overheat immediately."
        "\nA wall of hot air forces you back, and the room becomes impassable."
    )
    return False


def control_room():
    print("\n--- Scene 3: The Control Room ---")
    print(
        "You reach a control room containing a locked console and a large red"
        "\nemergency switch. The lights flash twice."
    )
    print("\n1. Insert the blue key into the console")
    print("2. Pull the red emergency switch")
    print("3. Guess the administrator password")

    choice = get_choice("\nWhat is your choice? ", ["key", "switch", "password"])

    if choice == 1:
        print(
            "\nThe console unlocks. A message appears: 'Manual exit override ready.'"
        )
        return True

    if choice == 2:
        print(
            "\nThe emergency switch cuts power to every system, including the"
            "\nelectronic door locks. You are trapped in complete darkness."
        )
        return False

    print(
        "\nAfter three incorrect attempts, the console activates a lockdown."
        "\nThe doors seal, and an automated voice announces an intrusion."
    )
    return False


def final_exit():
    print("\n--- Scene 4: The Main Exit ---")
    print(
        "The manual override has opened the final corridor. At the end is a heavy"
        "\nsteel door with two buttons: one marked EXIT and one marked RESET."
    )
    print("\n1. Press EXIT")
    print("2. Press RESET")
    print("3. Return to the control room")

    choice = get_choice("\nWhich button do you press? ", ["exit", "reset", "return"])

    if choice == 1:
        print(
            "\nThe door opens to the night air. You stumble outside as the server"
            "\nroom powers down behind you."
        )
        print("\nYOU WIN! You escaped the server room.")
        return True

    if choice == 2:
        print(
            "\nThe entire building resets. The door locks, the lights go out, and"
            "\nyou hear the servers restarting around you."
        )
        print("\nYOU LOSE! You reset the very system that could have freed you.")
        return False

    print(
        "\nYou return to the control room, but the override timer expires before"
        "\nyou can reopen the exit."
    )
    print("\nYOU LOSE! The server room locks down permanently.")
    return False


def play_game():
    introduction()

    if not security_checkpoint():
        print("\nYOU LOSE! Your first decision ends the adventure.")
        return

    if not cooling_corridor():
        print("\nYOU LOSE! The server room claims another victim.")
        return

    if not control_room():
        print("\nYOU LOSE! The lockdown has trapped you inside.")
        return

    final_exit()


def main():
    while True:
        play_game()

        while True:
            try:
                play_again = input("\nWould you like to play again? (y/n): ").strip().lower()
            except EOFError:
                print("\nThanks for playing!")
                return

            if play_again in ("y", "yes"):
                break

            if play_again in ("n", "no"):
                print("\nThanks for playing!")
                return

            print("Please enter y or n.")


if __name__ == "__main__":
    main()
