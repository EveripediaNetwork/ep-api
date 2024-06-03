import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import UserService from './user.service'
import TokenValidator from '../utils/validateToken'
import User from '../../Database/Entities/user.entity'
import UserProfile from '../../Database/Entities/userProfile.entity'
// import { ethers } from 'ethers'

describe('UserService', () => {
  let userService: UserService
  let dataSource: Partial<DataSource>
  let configService: Partial<ConfigService>
  let tokenValidator: Partial<TokenValidator>

  jest.mock('ethers')

  const mockQueryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockReturnThis(),
  }
  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn().mockReturnValue(null),
    create: jest.fn().mockReturnValue({}),
    save: jest.fn().mockReturnValue({}),
  }

  beforeEach(async () => {
    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    }

    configService = {
      get: jest.fn().mockReturnValue('fakeApiKey'),
    }

    tokenValidator = {
      validateToken: jest.fn().mockReturnValue('fakeValidatedId'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: TokenValidator, useValue: tokenValidator },
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
  })

  const profileData = {
    id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E',
    username: 'user',
    bio: 'bio',
    email: 'email@example.com',
    avatar: 'avatar',
    banner: 'banner',
    links: [],
    notifications: [],
    advancedSettings: {},
  }

  describe('createProfile', () => {
    it('should return false if validateEnsAddr returns false', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(false)

      const result = await userService.createProfile('{"id": "0X5456AFEA3AA035088FE1F9AA36509B320360A89E"}', 'token')

      expect(result).toBe(false)
    })

    it('should create and return a new profile if it does not exist', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const result = await userService.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({})
    })

    it('should update and return the profile if it exists', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E' })

      const result = await userService.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({ id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E' })
    })

    it('should create a new profile and user if neither exists', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const result = await userService.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({})
    })

    it('should create a new user if profile exists but user does not', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E' })
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const result = await userService.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({ id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E' })
    })
    it('should not duplicate user ID regardless of case', async () => {
      jest.spyOn(userService, 'validateEnsAddr').mockResolvedValueOnce(true)
      jest.spyOn(tokenValidator, 'validateToken').mockReturnValueOnce('0x5456afea3aa035088fe1f9aa36509b320360a89e')
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      await userService.createProfile(JSON.stringify(profileData), 'token')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(id) = LOWER(:id)',
        { id: '0X5456AFEA3AA035088FE1F9AA36509B320360A89E' },
      )
    })
  })

  describe('getAllColumnNames', () => {
    it('should return an empty array if there are no columns in metadata', async () => {
      dataSource.getMetadata = jest.fn().mockReturnValue({ columns: [] })
      const result = await userService.getAllColumnNames(
        'entity',
        ['id', 'name'],
        'table',
      )
      expect(result).toEqual([])
    })

    it('should return all specified fields with table name prefix if all fields are present', async () => {
      dataSource.getMetadata = jest.fn().mockReturnValue({
        columns: [
          {
            propertyName: 'name',
          },
          {
            propertyName: 'email',
          },
        ],
      })
      const result = await userService.getAllColumnNames(
        'entity',
        ['id', 'name', 'email'],
        'table',
      )

      expect(result).toEqual(['table.id', 'table.name', 'table.email'])
    })

    it('should return only the specified fields that are present with table name prefix', async () => {
      dataSource.getMetadata = jest.fn().mockReturnValue({
        columns: [{ propertyName: 'id' }, { propertyName: 'name' }],
      })

      const result = await userService.getAllColumnNames(
        'entity',
        ['id', 'name', 'email'],
        'table',
      )

      expect(result).toEqual(['table.id', 'table.name'])
    })

    it('should return an empty array if none of the specified fields are present', async () => {
      dataSource.getMetadata = jest.fn().mockReturnValue({
        columns: [{ propertyName: 'age' }, { propertyName: 'address' }],
      })

      const result = await userService.getAllColumnNames(
        'entity',
        ['id', 'name', 'email'],
        'table',
      )

      expect(result).toEqual(['table.id'])
    })

    it('should include id field if not already included in specified fields', async () => {
      dataSource.getMetadata = jest.fn().mockReturnValue({
        columns: [{ propertyName: 'name' }, { propertyName: 'email' }],
      })

      const result = await userService.getAllColumnNames(
        'entity',
        ['name', 'email'],
        'table',
      )

      expect(result).toEqual(['table.id', 'table.name', 'table.email'])
    })
  })
  describe('getUser', () => {
    it('should construct the query with the correct parameters', async () => {
      const getAllColumnNamesSpy = jest
        .spyOn(userService, 'getAllColumnNames')
        .mockResolvedValueOnce(['user.id', 'user.name'])
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        id: '1',
        name: 'Test User',
      })

      const result = await userService.getUser('1', ['id', 'name'])

      expect(getAllColumnNamesSpy).toHaveBeenCalledWith(
        User,
        ['id', 'name'],
        'user',
      )
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user.id',
        'user.name',
      ])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('LOWER(id) = :id', {
        id: '1', 
      })
      expect(result).toEqual({ id: '1', name: 'Test User' })
    })

    it('should retrieve a user with specified fields when provided a valid ID', async () => {
      const getAllColumnNamesSpy = jest
        .spyOn(userService, 'getAllColumnNames')
        .mockResolvedValueOnce(['user.id', 'user.name', 'user.email'])
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser)

      const result = await userService.getUser('1', ['id', 'name', 'email'])

      expect(getAllColumnNamesSpy).toHaveBeenCalledWith(
        User,
        ['id', 'name', 'email'],
        'user',
      )
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user.id',
        'user.name',
        'user.email',
      ])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('LOWER(id) = :id', {
        id: '1',
      })
      expect(result).toEqual(mockUser)
    })
  })
  describe('getUserProfile', () => {
    it('should retrieve a user profile with specified fields when provided a valid ID', async () => {
      const getAllColumnNamesSpy = jest
        .spyOn(userService, 'getAllColumnNames')
        .mockResolvedValueOnce(['user_profile.id', 'user_profile.username'])
      const mockProfile = { id: '1', username: 'TestUser' }
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProfile)

      const args = { id: '1', username: '' }
      const result = await userService.getUserProfile(['id', 'username'], args)

      expect(getAllColumnNamesSpy).toHaveBeenCalledWith(
        UserProfile,
        ['id', 'username'],
        'user_profile',
      )
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user_profile.id',
        'user_profile.username',
      ])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('LOWER(id) = :id', {
        id: '1',
      })
      expect(result).toEqual(mockProfile)
    })

    it('should retrieve user profiles when no ID is provided and username is provided', async () => {
      const getAllColumnNamesSpy = jest
        .spyOn(userService, 'getAllColumnNames')
        .mockResolvedValueOnce(['user_profile.id', 'user_profile.username'])
      const mockProfiles = [
        { id: '1', username: 'TestUser' },
        { id: '2', username: 'AnotherUser' },
      ]
      mockQueryBuilder.getMany.mockResolvedValueOnce(mockProfiles)

      const args = { id: '', username: 'Test' }
      const result = await userService.getUserProfile(
        ['id', 'username'],
        args,
        true,
      )

      expect(getAllColumnNamesSpy).toHaveBeenCalledWith(
        UserProfile,
        ['id', 'username'],
        'user_profile',
      )
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user_profile.id',
        'user_profile.username',
      ])
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
        'LOWER(username) LIKE :username',
        { username: '%test%' },
      )
      expect(result).toEqual(mockProfiles)
    })

    it('should return null when the ID and username are not provided', async () => {
      const getAllColumnNamesSpy = jest
        .spyOn(userService, 'getAllColumnNames')
        .mockResolvedValueOnce(['user_profile.id', 'user_profile.username'])
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)

      const args = { id: '', username: '' }
      const result = await userService.getUserProfile(['id', 'username'], args)

      expect(getAllColumnNamesSpy).toHaveBeenCalledWith(
        UserProfile,
        ['id', 'username'],
        'user_profile',
      )
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user_profile.id',
        'user_profile.username',
      ])
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('LOWER(id) = :id', {
        id: '',
      })
      expect(result).toBeNull()
    })
  })
})
